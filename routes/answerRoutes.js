// refer to Question model (schema)
var Question = require('../app/models/question');
var Account = require('../app/models/account');

// error detection routine. (mainly to reduce redundent code)
function questionExists(req, res, err, question) {
  if (!question) {
    res.json({
      error: "Question with id "
      + req.params.question_id
      + " does not exists"
    });
    return false;
  }
  if (err) {
    console.log("Error in Get /question/:id \n" + err);
    return false;
  }
  return true;
}

init = function(router) {
  ////////////////////////////////////////////
  //      /answer
  ///////////////////////////////////////////
  router.route('/answer')

    //////////////////////////////////////////////////
    // POST req = {id: "", text: "", imageURL: "" (, userId: 11)}
    .post(function(req, res) {
        if (!req.body.id){
          res.json({error:"non-existant question id"});
          return;
        }

        // checks if user is logged in
        var userIdOnPost;
        if (!req.body.userId && !req.session.userId) {
          res.json({error:"please login to post question"});
          return;
        }
        if (req.body.userId) {
          userIdOnPost = req.body.userId;
        }
        else {
          userIdOnPost = req.session.userId;
        }

        // find the question according to question_id
        Question.findById(req.body.id,  function(err, question) {

          // find question by ID, and validate the result.
          if (!questionExists(req, res, err, question))
            return;

          // validate post.body and perform few autofix
          if (!req.body.text) {
        	    res.json({error:"Question has no text!"});
        	    return
        	}
        	var postImgURL = req.body.imageURL;
        	if (!postImgURL) {
        	    postImgURL = "";
        	}
          var answerToPush = {text: req.body.text, imageURL: postImgURL, userId: userIdOnPost};

          // $push answerToPush into answers array
          Question.findByIdAndUpdate(req.body.id, { $push: { answers: answerToPush }}, {safe:true, upsert:true, new: true},function (err, updatedQuestion) {
            if (err) {
              console.log(err);
		          res.send(err);
		          return;
	          }
	      
	      // Add Exp
	      Account.AddExp(answerToPush.userId, 10);
              res.json({error: "", id: updatedQuestion.answers[updatedQuestion.answers.length-1]._id});
            //console.log("Added Answer with id " + updatedQuestion.answers[updatedQuestion.answers.length-1]._id);
          });
        });
    })

    //////////////////////////////////////////////////
    // DELETE req = {id: ""}
    .delete(function(req, res) {
	// @todo check if user is logged in and owns the question or is admin
      if (!req.body.id){
        res.json({error:"non-existant answer id"});
        return;
      }
      if (!req.session.type || req.session.type!=="admin") {
        res.json({error:"only admin can delete"});
        return;
      }

      // find the question object that includes answer_id
      Question.findOne({"answers._id": req.body.id}, function(err, question){
        if (!questionExists(req, res, err, question))
          return;

        // loop through the answers array in the question object, and remove the target object from the answers array
        for (var i=0; i<question.answers.length; i++) {
          if (req.body.id==question.answers[i]._id) {
            //console.log("splice "+question.answers[i]);
            question.answers.splice(i, 1);
            break;
          }
        }

        // saving question with same mongoObjectID does not create a new object. Instead, existing one gets updated
        question.save(function(err, savedQuestion) {
          if (err)
          {
            console.log(err);
        		res.send({"error": err});
          }
          res.send({"error":""});
      		return;
        });
      });

    });
}

module.exports.init = init;
