const db = require('../models');
const passport = require('passport');
const { Op } = require('sequelize');

module.exports = function(app){

    // use passport to authenticate the login credentials.
    app.post('/api/login', passport.authenticate('local'), function(req, res) {
			// console.log('From post to api/login', req.user);
			return res.json(req.user);
		});

		// logout
		app.get('/logout', function(req,res) {
			req.logout();
			return res.redirect('/');
    });

    // create a user
    app.post('/api/signup', function(req, res) {
			console.log('signup ',req.body);
			db.User.create({
				// create values based off of req body
				email: req.body.email,
				password: req.body.password,
				username: req.body.username,
				firstName: req.body.firstName,
				lastName: req.body.lastName,
			}).then(function() {
				// if successful user directed to login page
				return res.redirect(307, '/api/login');
			}).catch(function(err) {
				console.log(err);
				return res.status(401).json(err);
			});
		});


	app.get('/api/userData', function(req, res) {
		if (!req.user) {
			// The user is not logged in, send back an empty object
			return res.json({});
		} else {
			// Otherwise send back the user's email and id
			// Sending back a password, even a hashed password, isn't a good idea
			return res.json({
				id: req.user.id,
				email: req.user.email,
				username: req.user.username,
				firstName: req.user.firstName,
				lastName: req.user.lastName,
				bio: req.user.bio,
			});
		}
	});

	// get all users
	app.get('/api/users', function(req, res){
		db.User.findAll({}).then(function(data) {
			return res.json(data);
		});
	});

	// update a user
	app.put('/api/users', function(req, res) {
		db.User.update(
			req.body,
			{
				where: {
					id: req.body.id
				}
			}).then(function(data) {
				return res.json(data);
			}).catch(err => res.status(401).json(err));
	});

	// get a single user
	app.get('/api/users/:id', function(req, res){
		db.User.findOne({
			where: {
				id: req.params.id
			}
		}).then(function(data) {
			return res.json(data);
		});
	});

	// get all recipes
	app.get('/api/recipes', function(req,res){
	db.Recipe.findAll({}).then(r=>{
		console.log(r);
		return res.json(r);
		});
	});

	app.put('/api/recipes', function(req, res) {
		console.log('route', req.body);
		db.Recipe.update(
			req.body,
			{
				where: {
					id: req.body.id
				}
			}).then(function(data) {
				return res.json(data);
			}).catch(err => res.status(401).json(err));
	});

	app.get('/api/recipes/:search', function(req,res){
		let search =req.params.search;
		db.Recipe.findAll({
			where:{
				[Op.or]:
				[
					{recipeName:{[Op.substring]:`%${search}%`}},
					{ingredients:{[Op.substring]:`%${search}%`}},
					{instructions:{[Op.substring]:`%${search}%`}},
					{description:{[Op.substring]:`%${search}%`}},
					{chefComments:{[Op.substring]:`%${search}%`}}
				]
			},
			include:[db.User, db.Comment]
		}).then(function(data) {
			return res.json(data);
		});
	});

	// get recipes based off of UserId
	app.get('/api/recipes/:id', function(req, res) {
		db.Recipe.findAll({
			where: {
				UserId: req.params.id,
			}
		}).then(function(data) {
			return res.json(data);
		});
	});

	// get all the recipes for a given user
	app.get('/api/user-recipes/', function(req, res){
		if (req.user){
			db.Recipe.findAll({
				where: {
					UserId: req.user.id
				}
			}).then(results => {
				res.json(results);

				//below lines to be used when handlebars page is ready
				// return res.render('user-profile', {recipes: results});
			}).catch(err => res.status(401).json(err));
		}
	});

	app.put('/api/bio/:id', function(req, res){
		console.log('req.body ', req.body);
		console.log('req.params.id ', req.params.id);
		db.User.update(
			req.body,
			{
				where: {
					id:req.params.id
				}
			}).then(r => res.json(r))
			.catch(err=> res.status(401).json(err));
	});



		// get all comments
    app.get('/api/comments', function(req,res){
		db.Comment.findAll({}).then(r=>{
			console.log(r);
			return res.json(r);
		});
		});

		app.post('/api/comments', function(req, res) {
			db.Comment.create({
				commentBody: req.body.commentBody,
				RecipeId: req.body.RecipeId,
			}).then(function(data) {
				return res.json(data);
			});
		});

    //add a recipe. req.body is already formatted to match our Recipe model
    app.post('/api/add-recipe', function(req, res){
		if (req.user){ //if user is logged in, attribute the recipe to their user id
			recipe = req.body;
			recipe.UserId = req.user.id;
			console.log('Added recipe: ', recipe);
			db.Recipe.create(recipe)
			.then(()=> res.render('profile'))
			.catch(err => res.status(401).json(err));
		} else { //otherwise make an anonyous recipe
			db.Recipe.create(req.body)
			.then(()=> res.render('index'))
			.catch(err => res.status(401).json(err));
		}
	});

	//delete user with id in request parameters
	app.delete('/api/user/:id', function(req,res){
		db.User.destroy({
			where: {
				id: req.params.id
			}
		}).then(user => res.json(user));
	});

	//delete recipe that has the id in request parameters
	app.delete('/api/recipes/:id', function(req, res){
		db.Recipe.destroy({
			where: {
				id: req.params.id
			}
		}).then(recipe => res.json(recipe));
	});

	app.get('/api/all-recipes/:recipe', function(req,res) {
		let search = req.params.recipe;
		console.log('search: ',search);
		// second argument only returns what is selected from the columns, if left out then the meta data will come back in an array.
		db.sequelize.query(`SELECT * FROM cookbook_db.recipes JOIN cookbook_db.users ON (users.id = recipes.UserId) WHERE recipeName LIKE '%${search}%' OR ingredients LIKE '%${search}%' OR recipes.description LIKE '%${search}%';`,{ type: db.sequelize.QueryTypes.SELECT})
		.then(function(data){
				// console.log('data: ', data);
				return res.json(data);
			}).catch(err => res.status(401).json(err));
	});

};