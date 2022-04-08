const express = require('express');
const controller = require('../api/index/Controller');

const router = express.Router();

router.get('/',(req,res)=> res.status(200).send('I am Working fine :}'));
router.post('/',(req,res)=> res.status(201).send(`Recieved : ${JSON.stringify(req.body)}`))
router.post('/user/login', (req, res)=>controller.login(req,res));
router.get('/loginInfo/:a_id/:u_id', (req, res) => controller.loginInfo(req, res));
router.get('/markAnswer/:a_id/:u_id', (req, res) => controller.markAnswer(req, res));
router.get('/submit/:a_id/:u_id', (req, res) => controller.submit(req, res));
module.exports = router;
