const moment = require('moment');
const axios = require('axios');
const {
  Api500Error, Api401Error, Api200Success, Api400Error,
} = require('../../handlers/apiErrors');
const db = require('../../database/query');
const log = require('../../log/index');

const logger = log.getNormalLogger();
class Controller {
  static async login(req, res) {
    const data = req.body;
    const { u_id: uid, a_id: aid, password } = data;
    try {
      // confirm login credential with user_ms
      const user_ms_host = process.env.USER_MS_API;
      const payload = {
        u_id: uid,
        password,
      };
      let user_res;
      try {
        user_res = await axios.post(`${user_ms_host}/user/login`, payload);
      } catch (error) {
        if (error.response) {
          const responseObj = new Api500Error(
            `Api Responded with :code [${error.response.status}] ${error.response.data.message}`,
            `Api Responded with :code [${error.response.status}] ${error.response.data.message}`,
          );
          res.status(500).send(responseObj.toStringifiedJson());
        } else {
          this.sendApi500(res);
        }
        return;
      }

      // get data of user from userMS
      let requestUrl = `${user_ms_host}/user/getUserDetails?u_id=`;
      requestUrl += `${uid}&password=${password}`;
      const user_res_det = await axios.get(requestUrl);
      if (user_res.status != 200) {
        logger.http(user_res.data);
        res.status(user_res.statusCode).send(user_res.data);
        return;
      }
      const userRes = user_res_det.data.data;

      // get metadata
      const assessmentMetaData = await db.getAssessmentMetaData(aid);
      if (assessmentMetaData.error) {
        this.sendApi500(res);
        return;
      } if (assessmentMetaData.rows.length <= 0) {
        const responseObj = new Api400Error(
          'Assessment is not present',
          'Assessment is not present',
        );
        res.status(400).send(responseObj.toStringifiedJson());
        return;
      }

      // check scheduled on date to confirm exam is online
      const info = Controller.getAssessmentOnlineInfo(assessmentMetaData.rows[0]);
      console.log(`the Code guy : ${info}`);
      if (info == -1) {
        const responseObj = new Api400Error(
          'Assesment is Already done',
          'Assessment is Already Done',
        );
        res.status(400).send(responseObj.toStringifiedJson());
        return;
      } if (info == 1) {
        const responseObj = new Api400Error(
          'Assesment is scheduled in different time',
          'Assessment is scheduled in different time',
        );
        res.status(400).send(responseObj.toStringifiedJson());
        return;
      }

      // get assessment Data
      const assessmentData = await db.getAssessmentData(assessmentMetaData.rows[0].a_id);
      if (assessmentData.error) {
        this.sendApi500(res);
        return;
      }

      // Save Info
      const sendInfo = {
        userInfo: {
          uid,
          name: userRes.name,
          mail: userRes.email,
        },
        assessmentInfo: {
          aId: assessmentMetaData.rows[0].id.toString(),
          aName: assessmentData.rows[0].a_name,
          duration: assessmentMetaData.rows[0].meta_data.duration,
          totalQuestions: assessmentMetaData.rows[0].meta_data.total_questions,
          totalMarks: assessmentMetaData.rows[0].meta_data.total_marks,
        },
      };
      const responseOb = new Api200Success(
        'Login Succuessfull',
        `Loginn Attempt Unauthorized for : uid:${uid} aid:${aid} password:${password} and database response:${userRes.rows}`,
        sendInfo,
      );
      logger.info(`USER:${uid} Login Succuessful`);
      res.status(200).send(responseOb.toStringifiedJson());
    } catch (err) {
      logger.error(err);
      this.sendApi500(res);
    }
  }

  static async loginInfo(req, res) {
    try {
      const { u_id: uId, a_id: aId } = req.params;
      // check if done and not present in done
      const checkDone = await Controller.isUserDoneAssessment(aId, uId, res);
      if (checkDone) {
        // response handled by the function
        return;
      }

      // check reconnect or connected
      const isReconnect = await Controller.isReconnectionOfUser(aId, uId);
      const sendData = {
        time_remaining: null,
        marked_answers: null,
        questions: null,
        is_reconnection: isReconnect,
      };
      if (!isReconnect) {
        // create data on meta data
        const userInsert = await db.insertUserInAssessmentMeta(aId, uId);
        if (userInsert.error) {
          Controller.sendApi500(res, userInsert.error);
          return;
        }
      }

      // get duration metadata of exam
      const assesData = await db.getAssessmentMetaData(aId);
      if (assesData.error) {
        Controller.sendApi500(res, assesData.error);
        return;
      }

      // Get user marked and time remaining details check if it is valid
      const userData = await db.getUserDataFromAssessment_meta(aId, uId);
      if (userData.error) {
        Controller.sendApi500(res, userData.error);
        return;
      }
      const userDataObj = userData.rows[0].meta_data;
      const remaingTime = Controller.getRemainingTimeMs(userDataObj.examStartedOn, assesData.rows[0].meta_data.duration);

      // get assessment questions
      const questionData = await db.getQuestionsFromAssessment_meta(aId);
      if (questionData.error) {
        Controller.sendApi500(res, questionData.error);
        return;
      }
      const questionDataObj = questionData.rows;
      sendData.marked_answers = userDataObj.markedQuestions;
      sendData.time_remaining = remaingTime;
      sendData.questions = questionDataObj;

      const respObj = new Api200Success(
        'Assessment Fetched Succuess',
        'Fetch assessment succuess',
        sendData,
      );
      res.status(200).send(respObj.toStringifiedJson()).end();
    } catch (error) {
      Controller.sendApi500(res, error);
    }
  }

  static async markAnswer(req, res) {
    const { a_id: aId, u_id: uId } = req.params;
    const { q: questionIndex, a: answerIndex } = req.query;
    // check if user is alredy done with exam
    const isUserDone = await Controller.isUserDoneAssessment(aId, uId, res);
    if (isUserDone) {
      // response handled by controller
      return;
    }

    // check if the user really is in exam
    const isUserPresentToMark = await Controller.isReconnectionOfUser(aId, uId);
    if (!isUserPresentToMark) {
      const respObj = new Api401Error(
        'Please Login to Start exam First!',
        `Please Login to Start exam First! for ${uId} ${aId}`,
      );
      res.status(401).send(respObj.toStringifiedJson());
      return;
    }

    const insertAnswerQuery = await db.insertUserAnswers(aId, uId, questionIndex, answerIndex);
    if (insertAnswerQuery.error) {
      Controller.sendApi500(res, insertAnswerQuery.error);
      return;
    }
    const respObj = new Api200Success('insert success', 'answer inserted');
    res.status(200).send(respObj.toStringifiedJson());
  }

  static async submit(req, res) {
    const { a_id: aId, u_id: uId } = req.params;

    // check if user reallly present to mark as done
    const isUserPresentToMark = await Controller.isReconnectionOfUser(aId, uId);
    if (!isUserPresentToMark) {
      const respObj = new Api401Error(
        'Please Login to Start exam First!',
        `Please Login to Start exam First! for ${uId} ${aId}`,
      );
      res.status(401).send(respObj.toStringifiedJson());
      return;
    }

    const insertAnswerQuery = await db.insertUserToAssessmentDone(aId, uId);
    if (insertAnswerQuery.error) {
      Controller.sendApi500(res, insertAnswerQuery.error);
      return;
    }
    const respObj = new Api200Success('submit success', 'submit inserted');
    res.status(200).send(respObj.toStringifiedJson());
  }

  static sendApi500(res, error) {
    const respObj = new Api500Error(
      'Internal Server Error',
      `Internal Server Error ${error}`,
    );
    res.status(500).send(respObj.toStringifiedJson());
  }

  // helper methods
  static getRemainingTimeMs(startedAt, duration) {
    const startedAtObj = moment(startedAt);
    const endingAtObj = startedAtObj.add(duration, 'ms');
    console.log(`${startedAtObj.toString()}  ${endingAtObj.toString()}  ${(endingAtObj.diff(moment.now(), 'ms')).toString()}`);
    console.log(endingAtObj.diff(moment.now(), 'ms'));
    if (endingAtObj < moment.now()) {
      // done
      return -1;
    }
    // remaing
    return endingAtObj.diff(moment.now(), 'ms');
  }

  static async isUserDoneAssessment(aId, uId, res) {
    // check if user alreday done
    const check1 = await db.isUserPresentInDone(aId, uId);
    if (check1.error) {
      Controller.sendApi500(res, check1.error);
      return true;
    }
    if (check1.rows == true) {
      const respObj = new Api401Error(
        'User Already Attended Exam',
        'User Already Attended Exam',
      );
      res.status(401).send(respObj.toStringifiedJson());
      return true;
    }
    // check if new user then exit the function not even present in meta data
    const isNewUser = await Controller.isReconnectionOfUser(aId, uId);
    if (!isNewUser) {
      return false;
    }
    console.log('check done till isNewUser');
    // check if user time exceeded duration of exam
    // get duration metadata of exam
    const assesData = await db.getAssessmentMetaData(aId);
    if (assesData.error) {
      Controller.sendApi500(res, assesData.error);
      return;
    }

    const userData = await db.getUserDataFromAssessment_meta(aId, uId);
    if (userData.error) {
      Controller.sendApi500(res, userData.error);
      return;
    }
    const userDataObj = userData.rows[0].meta_data;
    const remaingTime = Controller.getRemainingTimeMs(userDataObj.examStartedOn, assesData.rows[0].meta_data.duration);
    console.log(remaingTime);
    if (remaingTime < 0) {
      const respObj = new Api401Error(
        'User Already Attended Exam',
        'User Already Attended Exam',
      );
      res.status(401).send(respObj.toStringifiedJson());
      db.insertUserToAssessmentDone(aId, uId);
      return true;
    }

    return false;
  }

  static async isReconnectionOfUser(aId, uId) {
    const check2 = await db.isUserPresentAssessment_meta(aId, uId);
    if (check2.error) {
      Controller.sendApi500(res, check2.error);
      return;
    }
    const isReconnect = check2.rows;
    return isReconnect;
  }

  static getAssessmentOnlineInfo(metaData) {
    const now = moment.now();
    const endsOn = moment(metaData.scheduled_till);
    const startsOn = moment(metaData.scheduled_on);
    if (now < startsOn) {
      return 1;
    }
    if (now > endsOn) {
      return -1;
    }
    return 0;
  }
}
module.exports = Controller;
