var requestURL = require('request');
var express = require('express'); 
var ejs = require('ejs'); //embedded javascript template engine

var app = express.createServer(express.logger());

/* HUNCH API AUTH CONFIG */
var crypto = require('crypto')
var shasum = crypto.createHash('sha1');

hunch = {
    app_id : '3147734',
    app_secret : '1446f922af86fbcb41897eec1837f5da3fb23bc3'
};
/* END HUNCH API AUTH CONFIG */

/*********** SERVER CONFIGURATION *****************/
app.configure(function() {
    
    
    /*********************************************************************************
        Configure the template engine
        We will use EJS (Embedded JavaScript) https://github.com/visionmedia/ejs
        
        Using templates keeps your logic and code separate from your HTML.
        We will render the html templates as needed by passing in the necessary data.
    *********************************************************************************/

    app.set('view engine','ejs');  // use the EJS node module
    app.set('views',__dirname+ '/views'); // use /views as template directory
    app.set('view options',{layout:true}); // use /views/layout.html to manage your main header/footer wrapping template
    app.register('html',require('ejs')); //use .html files in /views

    /******************************************************************
        The /static folder will hold all css, js and image assets.
        These files are static meaning they will not be used by
        NodeJS directly. 
        
        In your html template you will reference these assets
        as yourdomain.heroku.com/img/cats.gif or yourdomain.heroku.com/js/script.js
    ******************************************************************/
    app.use(express.static(__dirname + '/static'));
    
    //parse any http form post
    app.use(express.bodyParser());
    
    /**** Turn on some debugging tools ****/
    app.use(express.logger());
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

});
/*********** END SERVER CONFIGURATION *****************/



// main page 
app.get('/', function(req, res) {
    
    // the url you need to request from hunch
    url = "http://api.hunch.com/api/v1/get-recommendations/?auth_token=d25dbef5e3805ea9aac48f677dbc97aa8745722e&topic_ids=list_book&reverse"

    // make the request to Hunch api
    requestURL(url, function (error, response, hunchJSON) {
        
        // if successful
        if (!error && response.statusCode == 200) {

            // convert hunchJSON into JS object, hunchData
            hunchData = JSON.parse(hunchJSON);

            // prepare template variables
            var templateData = {
                'url' : url,
                'totalRecs' : hunchData.total,
                'hunchRecs' : hunchData.recommendations
            }
            
            // render the template with templateData
            res.render("hunch_display.html",templateData)
        }
    });

});

// end of main page


/***************  GET RECOMMENDATIONS BY AUTH_TOKEN  ****************/
app.get('/recommendations/:auth_token', function(req, res) {
    
    // get the auth token from the url
    auth_token = request.params.auth_token
    
    // the url you need to request from hunch
    url = "http://api.hunch.com/api/v1/get-recommendations/?auth_token="+auth_token+"&topic_ids=list_book&reverse"

    // make the request to Hunch api
    requestURL(url, function (error, response, hunchJSON) {
        
        // if successful
        if (!error && response.statusCode == 200) {

            // convert hunchJSON into JS object, hunchData
            hunchData = JSON.parse(hunchJSON);

            // prepare template variables
            var templateData = {
                'url' : url,
                'totalRecs' : hunchData.total,
                'hunchRecs' : hunchData.recommendations
            }
            
            // render the template with templateData
            res.render("hunch_display.html",templateData)
        }
    });

});
/***************  END RECOMMENDATIONS BY AUTH_TOKEN  ****************/

app.get("/login", function(request, response){
    
    response.redirect('http://www.hunch.com/authorize/v1/?app_id=' + hunch.app_id );
    
});

app.get('/hunchcallback', function(request, response){

    // get querystrings from hunch callback
    auth_token_key = request.query.auth_token_key
    user_id = request.query.user_id
    next = request.query.next
    
    appDict = {
        'app_id' : hunch.app_id,
        'auth_token_key' : auth_token_key
    }
    
    authSig = getAuthSig(appDict);
    
    get_token_request_url = "http://api.hunch.com/api/v1/get-auth-token/?app_id="+hunch.app_id+"&auth_token_key="+auth_token_key+"&auth_sig="+authSig;
    
    // 
    
    requestURL(get_token_request_url, function(error, httpResponse, data) {
        hunchData = JSON.parse(data);
        
        if (hunchData.status == "accepted") {
            auth_token = hunchData.auth_token;
            user_id = hunchData.user_id;
            
            response.redirect("/recommendations/" + auth_token);
        }
    });
    
    response.send("ok<br>" + authSig+"<br><br>"+url);
    
})

/********** Functions for Hunch Authentication ******************/
function urlencode(x) {
    return escape(x).replace('+','%2B').replace('/','%2F').replace('@','%40').replace('%20','+');
}

function getAuthSig(queryDict) {
    APP_SECRET = hunch.app_secret;
    
    var keys = [];
    for (var key in queryDict)
        keys.push(key);
    keys.sort();
    
    var queries = [];
    for (var i in keys)
        queries.push( urlencode(keys[i]) + '=' + urlencode(queryDict[keys[i]]) );
    var data = queries.join('&') + APP_SECRET;
    
    console.log(data);
    shasum.update(data);
    return shasum.digest('hex');

}

// Make server turn on and listen at defined PORT (or port 3000 if is not defined)
var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log('Listening on ' + port);
});