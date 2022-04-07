/* eslint-disable linebreak-style */
const { config } = require('dotenv');
const mysql = require('mysql2');
const { DBError } = require('../handlers/databaseErrors');
const { DBSuccess } = require('../handlers/databaseErrors');
const DBStatus = require('../handlers/databaseStatusCode');
const DBStatusCodes = require('../handlers/databaseStatusCode');
const log = require('../log/index');
const moment = require('moment');
const logger = log.getNormalLogger();

class Database {
    /** Callback for Select Queries
        *
        * @callback DatabaseSelectCallback callback used after callback
        * @param {Object} error - An Error fills if error is found.
        * @param {Object} rows - An row with dictionary inside array.
        * @param {Object} fields - An data on extra info of database.
        * */

    /** Callback for non select Queries
        *
        * @callback DatabaseOtherCallback callback used after callback
        * @param {Object} error - An Error fills if error is found.
        * @param {Object} res - Data on performing the query.
        * @param {String} res.message - Message to send
        * @param {Object} res.queryData - Data of performed query
        * */

    constructor() {
        logger.info('Connecting to DB ');
        this.pool = mysql.createPool({
            host: process.env.MYSQL_DB_HOST,
            user: process.env.MYSQL_DB_USERNAME,
            password: process.env.MYSQL_DB_PASSWORD,
            database: process.env.MYSQL_DB_NAME,
        });
    }

    async getConnection() {
        try {
            const conn = await this.pool.promise().getConnection();
            return new DBSuccess(
                'Success!',
                'Connection Success!',
                null,
                conn,
            );
        } catch (err) {
            logger.error(`Connection Failed error :${err.toString()} `);
            return {
                error: new DBError(
                    'Connection Failed!',
                    err,
                    DBStatus.CONN_FAILED,
                    'Connection failed',
                ),
            };
        }
    }
    async getQuestionsFromAssessment_meta(aId) {
        const res = await this.getConnection();
        let conn;
        if (!res.error) {
            conn = res.rows;
            
        } else {
            const out = 'Error getting connection to get user login=>';
            logger.error(`${out} ${aId} error: ${res.error}}`);
            return res;
        }

        const query = `select q.q_name,opt_ty.type,opt.raw from assessment_qs aq,question q,assessment_meta am,options opt,option_types opt_ty where 
                        aq.q_id = q.q_id and
                        aq.a_id = am.id and
                        opt.opt_id = q.option_id and
                        opt.option_type = opt_ty.id and
                        am.id = ? ;`;
        let rows;
        try {
            [rows] = await conn.query(query, [aId]);
        } catch (error) {
            logger.error(`Error Occured Getting Questions : ${error.toString()}`);
            return new DBError(
                'Select Error',
                error,
                conn,
                DBStatusCodes.SELECT_ERROR,
                `Selection of question with id : ${aId} Caused Error`,
            );
        }
        let questions = []

        rows.forEach(rawQuestion => {
            const question = {
                question: rawQuestion.q_name,
                ans_type: rawQuestion.type,
                options: rawQuestion.raw.data
            };
            questions.push(question);
        });
        return new DBSuccess('Fetch Success','Ftech Succees',conn,questions);
    }
    async getUserDataFromAssessment_meta(aId,uId){
        const res = await this.getConnection();
        let conn;
        if (!res.error) {
            conn = res.rows;
            
        } else {
            const out = 'Error getting connection to get user login=>';
            logger.error(`${out} ${aId} error: ${res.error}}`);
            return res;
        }

        const query = `select meta_data->'$.data.studentsLoggedIn."${uId}"' as meta_data from assessment_meta where id ='${aId}'`;
        let rows;
        try {
            [rows] = await conn.query(query);
        } catch (error) {
            logger.error(`Error Occured Getting Questions : ${error.toString()}`);
            return new DBError(
                'Select Error',
                error,
                conn,
                DBStatusCodes.SELECT_ERROR,
                `Selection of question with id : ${aId} Caused Error`,
            );
        }
        return new DBSuccess('Select Success', 'Selection of user Data is Success',conn, rows);

    }
    async getAssessmentData(aId){
        const res = await this.getConnection();
        let conn;
        if (!res.error) {
            conn = res.rows;
        } else {
            const out = 'Error getting connection to get assessmentData=>';
            logger.error(`${out} ${aId} error: ${res.error}}`);
            return res;
        }

        const query = `select * from assessment where a_id = '${aId}'`;
        logger.debug(`Running Query : ${query}`);
        let rows;
        try {
            [rows] = await conn.query(query);
        } catch (error) {
            logger.error(`Error Occured Getting Questions : ${error.toString()}`);
            return new DBError(
                'Select Error',
                error,
                conn,
                DBStatusCodes.SELECT_ERROR,
                `Selection of question with id : ${aId} Caused Error`,
            );
        }
        return new DBSuccess('Fetch success','Fetch success',conn,rows);
    }
    async getAssessmentMetaData(aId){
        const res = await this.getConnection();
        let conn;
        if (!res.error) {
            conn = res.rows;
            
        } else {
            const out = 'Error getting connection to get assessment Meta Data=>';
            logger.error(`${out} ${aId} error: ${res.error}}`);
            return res;
        }

        const query = `select * from assessment_meta where id = '${aId}'`;
        let rows;
        try {
            [rows] = await conn.query(query);
        } catch (error) {
            logger.error(`Error Occured Getting Questions : ${error.toString()}`);
            return new DBError(
                'Select Error',
                error,
                conn,
                DBStatusCodes.SELECT_ERROR,
                `Selection of question with id : ${aId} Caused Error`,
            );
        }
        return new DBSuccess('Fetch success','Fetch success',conn,rows);
    }
    async isUserPresentAssessment_meta(aId,uId){
        const res = await this.getConnection();
        let conn;
        if (!res.error) {
            conn = res.rows;
            
        } else {
            const out = 'Error getting connection to get user login=>';
            logger.error(`${out} ${aId} error: ${res.error}}`);
            return res;
        }

        const query = `SELECT JSON_CONTAINS_PATH(
            (select meta_data->'$.data.studentsLoggedIn' from assessment_meta where id = ?),
            'one', `
        const queryUid = query+`'$."${uId}"') as 'isPresent';`
        let rows;
        try {
            [rows] = await conn.query(queryUid,[aId]);
        } catch (error) {
            logger.error(`Error Occured Getting Questions : ${error.toString()}`);
            return new DBError(
                'Select Error',
                error,
                conn,
                DBStatusCodes.SELECT_ERROR,
                `Selection of question with id : ${aId} Caused Error`,
            );
        }
        if(rows[0].isPresent == 1){
            return new DBSuccess('Select Success', 'Selection of quser present Data is Success',conn, true);
        }
        else{
            return new DBSuccess('Select Success', 'Selection of user present Data is Success',conn, false);
        }
    }
    async isUserPresentInDone(aId,uId){
        const res = await this.getConnection();
        let conn;
        if (!res.error) {
            conn = res.rows;
            
        } else {
            const out = 'Error getting connection to get user login=>';
            logger.error(`${out} ${aId} error: ${res.error}}`);
            return res;
        }

        const query = `select JSON_SEARCH((select meta_data->'$.data.doneStudents' from assessment_meta where id = '${aId}'),
        'one','${uId}') as isPresent;`
        let rows;
        try {
            [rows] = await conn.query(query);
        } catch (error) {
            logger.error(`Error Occured Getting Questions : ${error.toString()}`);
            return new DBError(
                'Select Error',
                error,
                conn,
                DBStatusCodes.SELECT_ERROR,
                `Selection of question with id : ${aId} Caused Error`,
            );
        }
        if(rows[0].isPresent != null){
            return new DBSuccess('Select Success', 'Selection of quser present Data is Success',conn, true);
        }
        else{
            return new DBSuccess('Select Success', 'Selection of user present Data is Success',conn, false);
        }
    }

    async insertUserInAssessmentMeta(aId,uId){
        const res = await this.getConnection();
        let conn;
        if (!res.error) {
            conn = res.rows;
            
        } else {
            const out = 'Error getting connection to get user login=>';
            logger.error(`${out} ${aId} error: ${res.error}}`);
            return res;
        }
        const userModel = '{"markedQuestions": {},"number_of_reconnections": 0,"examStartedOn": "'+moment().format().toString()+'"}' 
        const query = `update assessment_meta 
        set meta_data = JSON_SET(meta_data,'$.data.studentsLoggedIn."${uId}"',cast('`+userModel +`' as JSON)) where id = '${aId}'`;
        let rows;
        try {
            [rows] = await conn.query(query);
        } catch (error) {
            logger.error(`Error Occured Getting Questions : ${error.toString()}`);
            return new DBError(
                'Select Error',
                error,
                conn,
                DBStatusCodes.SELECT_ERROR,
                `Selection of question with id : ${aId} Caused Error`,
            );
        }
        return new DBSuccess("user meta insert Succuess","user meta insert Succuess",conn);

    }
    async insertUserAnswers(aId,uId,questionIndex,answerIndex){
        const res = await this.getConnection();
        let conn;
        if (!res.error) {
            conn = res.rows;
            
        } else {
            const out = 'Error getting connection to get user login=>';
            logger.error(`${out} ${aId} error: ${res.error}}`);
            return res;
        }

        const answerModel = '{"'+ questionIndex+'":"'+answerIndex+'"}';
        const query = `update assessment_meta
        set meta_data = JSON_SET(meta_data,'$.data.studentsLoggedIn."${uId}".markedQuestions', 
        JSON_MERGE_PATCH(meta_data->'$.data.studentsLoggedIn."${uId}".markedQuestions',cast('`+answerModel+`' as JSON))) where id = '${aId}';`
    
        console.log(query);
        let rows;
        try {
            [rows] = await conn.query(query);
        } catch (error) {
            logger.error(`Error Occured Getting Questions : ${error.toString()}`);
            return new DBError(
                'Select Error',
                error,
                conn,
                DBStatusCodes.SELECT_ERROR,
                `Selection of question with id : ${aId} Caused Error`,
            );
        }
        return new DBSuccess("user meta insert Succuess","user meta insert Succuess",conn);

    }
    async insertUserToAssessmentDone(aId,uId){
        const res = await this.getConnection();
        let conn;
        if (!res.error) {
            conn = res.rows;
            
        } else {
            const out = 'Error getting connection to get user login=>';
            logger.error(`${out} ${aId} error: ${res.error}}`);
            return res;
        }

        const query = `update assessment_meta 
        set meta_data = JSON_SET(meta_data,'$.data.doneStudents',JSON_ARRAY_APPEND(meta_data->'$.data.doneStudents','$',"${uId}")) where id = '${aId}'`;
        let rows;
        try {
            [rows] = await conn.query(query);
        } catch (error) {
            logger.error(`Error Occured Getting Questions : ${error.toString()}`);
            return new DBError(
                'Select Error',
                error,
                conn,
                DBStatusCodes.SELECT_ERROR,
                `Selection of question with id : ${aId} Caused Error`,
            );
        }
        return new DBSuccess("user meta insert Succuess","user meta insert Succuess",conn);
    }
}
const db = new Database();
module.exports = db;
