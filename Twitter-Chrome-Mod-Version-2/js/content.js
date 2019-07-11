/* Authors

June 2019-Current
Jane Im

Jan 2018-Current
Sonali Tandon

Jan 2018-June 2018
Puhe Liang
Saebom Kwon
Jacob Berman
Paiju Chang

*/

// poll frequently to check first if URL is changed - avoid calling Twitter API
// needed to go back and forth from different tabs as well
var jsTimerForURLChange = setInterval(checkForJS_Finish, 8000);
// call checkForJS_Finish() as init()
window.onload = checkForJS_Finish()
var userID;
var item, abusive_list; // jSON returned from server. Making it public for highlighting abusive words on lazy loading
var stranger_list = [];
var response_json = {}

var flagged_tweets_tab;
var flagged_tweets_flag = false;
//keep track of currentPage
var currentPage = window.location.href;
//global variables common to hometimeline/notificationtweets
var global_tweetcount = 0;
var flagged_posts =[]
var flagged_tweets =[]
var threshold;
var statusDiv;

function checkForJS_Finish() {

  if(localStorage.getItem('threshold') != null){
    console.log('not null!')
    threshold = localStorage.getItem('threshold');
  }else{
    // build popup
    localStorage.setItem('threshold', 0.3);
    threshold = localStorage.getItem('threshold');
    console.log('set threshold as default for now')
  }
  

 if(currentPage != window.location.href)     {
  currentPage = window.location.href

  console.log('currentpage' + currentPage)
  console.log('window.location'+ window.location.href)

  if (document.querySelector(".ProfileHeaderCard-bio")) {
    if (document.querySelector(".ProfileHeaderCard-screennameLink > span > b").innerText != userID){
      userID = findUserId(document);
      console.log('checkForJS_Finish')
      console.log(userID)
      // get_score(userID, checkabusive);
      get_score(userID, pollStatus);
      addTab()
    } else{
        console.log('means the user moved from different tab')
        get_score(userID, pollStatus);
        addTab()

    }
  }
  
  // if (document.querySelector(".home.active")) {
    // global_tweetcount = 0
    // getPostsFromHomeTimeline();
  // }

  // if (document.querySelector(".NotificationsHeadingContent")!=null) {
  //       global_tweetcount = 0
  //       getPostsFromNotificationTimeline();
  //       addTab()
  //   }


  // // keep polling on timeline/notification page - as this loads only first 5 tweets on URL change
  // if (document.querySelector(".home.active")) {
        // getPostsFromHomeTimeline();
    // }

      // if (document.querySelector(".NotificationsHeadingContent")) {
        // getPostsFromNotificationTimeline();
    // }
  }
}


function get_score(username, callback) {
    var url = "http://twitter-shield.si.umich.edu/toxicityscore?user=" + username + '&threshold=' + threshold;
    console.log('get_score')
    // var url = "http://127.0.0.1:8000/toxicityscore?user=" + username + '&threshold=' + threshold;
    var request = new XMLHttpRequest();
    request.onreadystatechange = function(){
        if (request.readyState == 4 && request.status == 200){
            console.log('returned: ' + request.responseText)
            callback(request.responseText); // Another callback here
        }
    };
    request.open('GET', url);
    request.send();
    console.log('done')
}

// this visualizes flagged tweets when scrolling
window.onscroll = function(ev) {
    if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight) {
        // if(document.getElementsByClassName("home active")!=null)
          // getPostsFromHomeTimeline()
        if (document.querySelector(".ProfileHeaderCard-bio"))
          // highlightAbusivePosts(response_json.flagged_tweets)
          highlightAbusivePosts(response_json)
    }
};


function pollStatus(response){
  console.log('called poll status!')
  console.log(response)
  response_json = JSON.parse(response);
  task_id = response_json['task_id']
  screen_name = response_json['screen_name']
  threshold = response_json['threshold']
 
  //flagged_tweets = response_json.flagged_tweets
  task_id = response_json['task_id']
  screen_name = response_json['screen_name']
  threshold = response_json['threshold']
  // var url = "http://127.0.0.1:8000/poll_status?task_id=" + task_id + '&screen_name=' + screen_name + '&threshold=' + threshold
  var url = "http://twitter-shield.si.umich.edu/poll_status?task_id=" + task_id + '&screen_name=' + screen_name + '&threshold=' + threshold
  var request = new XMLHttpRequest();

  request.onreadystatechange = function(){
    // if (request.readyState == 4 && request.status == 200){
    console.log(request.readyState)
    if (request.readyState == 4){
      console.log(request)
      result = JSON.parse(request.responseText)
      console.log('poll status')
      // console.log(result)
      console.log(result['state'])
      if (result['state'] == 'PENDING'){
        console.log('pending')
        console.log(request.responseText)
        status = JSON.parse(request.responseText)['result']
        console.log(status)
        visualizeStatus(status)
        setTimeout(pollStatus(response), 3000);
      }else if (result['state'] == 'SUCCESS'){
        console.log('success')
        // console.log(request.responseText)
        checkabusive(request.responseText)
        visualizeStatus('done')
        addFlagging()
      }

      // checkabusive(request.responseText)
    }else{
      console.log('not yet 4')
      console.log(request)
    }
  };

  request.open('GET', url);
  request.send();



}


function checkabusive(response) {
  // need to update!
  response_json = JSON.parse(response);
  //flagged_tweets = response_json.flagged_tweets

  changeBio(response_json['result'])
  highlightAbusivePosts(response_json['result'])
}



function visualizeStatus(status){
  if(document.getElementById('status')==null){
    statusDiv = document.createElement('span');
    statusDiv.id = 'status'
    statusDiv.setAttribute('style', 'font-size:1.2em; background-color:#0084B4; padding:3px; border-radius: 15px;')
    document.getElementsByClassName('ProfileHeaderCard')[0].insertBefore(statusDiv, document.getElementsByClassName('ProfileHeaderCard-name')[0])
    document.getElementById('status').style.color  = 'white';
  }
  console.log('visualizeStatus function')
  console.log(status)

  if(status == 'done'){
    statusDiv.innerHTML = '<br>';
    statusDiv.setAttribute('style', 'padding:0px; margin-bottom: 3px;')
  }else if (status == 'started'){
    statusDiv.innerHTML = ' Started! '
  }else{
    statusDiv.innerHTML = status + ' stored!'
  }
}

function changeBio(response_json){
    console.log('beginning of changeBio')
    console.log(response_json)

    // why would you need this?
    userID = document.querySelector(".ProfileHeaderCard-nameLink").innerText;

    var prof = document.querySelector(".ProfileAvatar");
    console.log(prof);

    //change response_json to json
    console.log("CHANGE--response_json below:")
    console.log(typeof(response_json))
    console.log(response_json)

    score = response_json['TOXICITY']['score']
    console.log(response_json['visualize'])
    if(response_json['visualize'] == 'Below threshold'){
      console.log("BELOW SHOULD BE GREEN")
      prof.style.borderColor = "green";
    }else{
      console.log("ABOVE PINK")
      prof.style.borderColor = "#FC427B"; 
    }

  var originalDiv = document.getElementsByClassName("ProfileHeaderCard-screenname");
  var parents = document.getElementsByClassName("AppContent-main content-main u-cf");
  // parents[0].setAttribute("stsle", "margin-top:50px;");

  if (! document.getElementById("bio-box")) {
    // Parent Element
    var biobox = document.createElement("DIV");
    originalDiv[0].insertAdjacentElement("afterend", biobox);
    biobox.id = "bio-box";


    // Title
    var biobox_title = document.createElement("DIV");
    biobox.appendChild(biobox_title);
    biobox_title.className = "panel panel-default";

    // Title Body
    var biobox_title_body = document.createElement("DIV");
    biobox_title.appendChild(biobox_title_body);
    biobox_title_body.className = "panel-body";
    //biobox_title_body.innerText = "Tweety Holmes";

    // Title Image
    // var logo = document.createElement("IMG");
    // logo.src = chrome.extension.getURL("icon.png");
    // logo.setAttribute("id", "bio-box-img");
    // biobox_title_body.append(logo);

    // Box
    var charbox = document.createElement("DIV");
    biobox_title_body.appendChild(charbox);
    charbox.id = "char-box";

    var biobox_char = document.createElement("P");
    charbox.appendChild(biobox_char);
    biobox_char.id = "bio-box-text";
    biobox_char.innerHTML = "Toxicity score: " + score

    // + '</br>' + 'Number of tweets considered :' +response_json.tweets_considered_count
    //+ "Number of tweets flagged : " + response_json.flagged_tweets.length+  " of " + response_json.number_of_tweets_considered;
    if(response_json['visualize'] == 'Below threshold') {
      biobox_char.style.color = 'green';
    }
    else {
       biobox_char.style.color = '#FC427B';
    }

    // temporary code
    if(document.getElementById('status')==null){
      statusDiv = document.createElement('span');
      statusDiv.id = 'status'
      statusDiv.setAttribute('style', 'font-size:1.2em; background-color:#0084B4; padding:3px; border-radius: 15px;')
      document.getElementsByClassName('ProfileHeaderCard')[0].insertBefore(statusDiv, document.getElementsByClassName('ProfileHeaderCard-name')[0])
      document.getElementById('status').style.color  = 'white';
    }
    statusDiv.innerHTML = '<br>';
    statusDiv.setAttribute('style', 'padding:0px;');
    // Prompt Abusive_toggle
    // var biobox_char = document.createElement("P");
    // charbox.appendChild(biobox_char);
    // biobox_char.id = "bio-box-text";
    // biobox_char.innerText = "This user is";

    // // Abusive Toggle
    // var biobox_char_toggle = document.createElement("P");
    // biobox_char.appendChild(biobox_char_toggle);
    // biobox_char_toggle.id = "bio-box-highlight";
    // biobox_char_toggle.innerText = "Abusive";

    // // Prompt Abusive_words
    // var biobox_word = document.createElement("P");
    // charbox.appendChild(biobox_word);
    // biobox_word.id = "bio-box-text";
    // biobox_word.innerText = "Few abusive words used";

    // // Abusive_words
    // var list_group = document.createElement("DIV");
    // var word_div = document.createElement('H2');
    // list_group.appendChild(word_div);
    // charbox.appendChild(list_group);

    // if(abusive_list.length >= 7) {
    //   for(i=0; i<7; i++) {
    //     var biobox_word_items = document.createElement("SPAN");
    //     biobox_word_items.className = "badge badge-secondary";
    //     biobox_word_items.id = "badge-word";
    //     biobox_word_items.style.margin = "5px 5px 0 0";
    //     biobox_word_items.innerText = abusive_list[i];
    //     word_div.appendChild(biobox_word_items);
    //   }
    // }
    // else {
    //   for(i=0; i<abusive_list.length; i++) {
    //     var biobox_word_items = document.createElement("SPAN");
    //     biobox_word_items.className = "badge badge-secondary";
    //     biobox_word_items.id = "badge-word";
    //     biobox_word_items.style.margin = "5px 5px 0 0";
    //     biobox_word_items.innerText = abusive_list[i];
    //     word_div.appendChild(biobox_word_items);

    //     var bio1 = document.getElementsByClassName("ProfileHeaderCard-bio");
    //     var bio2 = document.getElementsByClassName("ProfileHeaderCard-location");
    //     var bio3 = document.getElementsByClassName("ProfileHeaderCard-url");
    //     var bio4 = document.getElementsByClassName("ProfileHeaderCard-joinDate");
    //     var bio5 = document.getElementsByClassName("ProfileHeaderCard-birthdate");
    //     var bio6 = document.getElementsByClassName("ProfileMessagingActions");

    //     bio1[0].setAttribute("class", "u-hidden");
    //     bio2[0].setAttribute("class", "u-hidden");
    //     bio3[0].setAttribute("class", "u-hidden");
    //     bio4[0].setAttribute("class", "u-hidden");
    //     bio5[0].setAttribute("class", "u-hidden");
    //     bio6[0].setAttribute("style", "margin-top:0px;");
    //   }
    // }
  }
}

// function changeProfileStats(data) {
//   response_json = JSON.parse(data);
//   user_consensus_score = response_json.user_consensus_score;
//   var profileStats = document.querySelector(".ProfileCardStats-statLabel.u-block");
//     if(profileStats){
//             profileStats.innerText = 'Abusive Score';
//       profileStats.style.color = 'rgb(252, 66, 123)';

//     }

//    if(document.querySelector(".ProfileCardStats-statValue"))
//       document.querySelector(".ProfileCardStats-statValue").innerText = user_consensus_score.toFixed(2);
//       document.querySelector(".ProfileCardStats-statValue").style.color = 'rgb(252, 66, 123)'
// }

function getPostsFromHomeTimeline(){
  //console.log('getPostsFromHomeTimeline')
    sendPostsToPredict()
    if(document.querySelector(".u-linkComplex-target")){
      userID = document.querySelector(".u-linkComplex-target").innerText
      get_score(userID, changeProfileStats,null)
    }

    sendUsersToPredict()
}

function getPostsFromNotificationTimeline(){
   //console.log('getPostsFromNotificationTimeline')
    // sendPostsToPredict()
    // add every user consensus score
    sendUsersToPredict()
}

//generic functionality that sends a bunch of tweets for prediction
function sendPostsToPredict(){

  var tweets = document.querySelectorAll(".tweet-text");
  var tweets_text = []
  ////console.log('Global tweet count' + global_tweetcount)
  ////console.log('Tweet queried length' + tweets.length)

    if(tweets.length > global_tweetcount){
      ////console.log(tweets)

      global_tweetcount = tweets.length;
       for(i=0;i<tweets.length;i++){
      // clean URL to form JSON parameters
      temp = tweets[i].innerText.replace(/(?:https?|www):\/\/[\n\S]+/g, '')
      temp =  temp.replace(/\W+/g," ")
      tweets_text.push({"text":temp})
    }

    ////console.log('Preprocessed text length' +tweets_text.length)

      var url = "http://127.0.0.1:5000/predict?tweets=" + JSON.stringify(tweets_text);

      //is it not picking up on time? is 3000 too short?
      var request = new XMLHttpRequest();
      request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200) {
          response_json = JSON.parse(request.responseText);
          //console.log('Flagged tweets length'+response_json.flagged_tweets.length)
          flagged_tweets = response_json.flagged_tweets
          highlightAbusivePosts(response_json.flagged_tweets);
        }
      };
      request.open('GET', url);
      request.send();
      }
}


function get_score_notif(userIDNode) {
  var url =  "http://twitter-shield.si.umich.edu/tpi?user=" + userIDNode.innerText + "&numberTwit=200";
  // var url = "http://127.0.0.1:8000/tpi?user=" + userIDNode.innerText + "&numberTwit=200";
  ////console.log(url);
  var request = new XMLHttpRequest();
  request.onreadystatechange = function() {
    if (request.readyState == 4 && request.status == 200) {
      let stranger_item = JSON.parse(request.responseText);
      ////console.log(stranger_item.yes_no);
      if (stranger_item.yes_no == true) {
        changeNameHeader(userIDNode);
      }
    }
  };
  request.open('GET', url);
  request.send();
}

function changeNameHeader(userIDNode) {
  var warningNotification = document.createElement('span');
  warningNotification.innerText = " WARNING! Potentially Abusive";
  warningNotification.id = "warning";
  userIDNode.appendChild(warningNotification);
}

function findUserId(document) {
  let userId = document.querySelector(".ProfileHeaderCard-screennameLink > span > b");
  return userId.innerText;
}

function checkNotifUserId(document) {
  let container = document.querySelector(".stream");
  let items = container.querySelectorAll(".account-group");
  items.forEach(function(element) {
    let userIDNode = element.querySelector(".account-group .username > b");
    if (!stranger_list.includes(userIDNode.innerText)) {
      stranger_list.push(userIDNode.innerText);
      ////console.log(userIDNode.innerText);
      get_score_notif(userIDNode);
    }
  });
}

function highlightAbusivePosts(response_json) {
  flagged_tweets = response_json['tweets_with_scores']
    
  var alltweets = document.querySelectorAll(".tweet-text");

  for(i=0;i<alltweets.length;i++){
    var tweet = alltweets[i].innerText;
    // tweet = tweet.replace(/(?:https?|www):\/\/[\n\S]+/g, '')
    // tweet = tweet.replace(/\W+/g," ")
    // tweet = tweet.toLowerCase().trim()
    //console.log(flagged_tweets)
    for(j=0;j<flagged_tweets.length;j++){
      // if(document.querySelector(".ProfileAvatar"))
      //   document.querySelector(".ProfileAvatar").style.borderColor = "rgb(252, 66, 123)";
  
      // need to change below to something else. 
      if(flagged_tweets[j]["original_tweet_text"].includes(tweet)){

        alltweets[i].style.backgroundColor = "rgba(252, 66, 123,0.1)"
        if(document.querySelector(".avatar.js-action-profile-avatar"))
          alltweets[i].parentElement.parentElement.firstElementChild.firstElementChild.firstElementChild.style.border = '3px solid rgb(252, 66, 123)';


        // if(document.getElementById('model-tag-'+j)==null){
        //   var model_tags = document.createElement('span')
        //   model_tags.innerHTML = flagged_tweets[j].models_that_agree
        //   model_tags.id = "model-tag-"+j
        //   model_tags.style.color =  "#e0245e"
        //   //////console.log(model_tags)
        //   var parent = alltweets[i].parentElement.parentElement.firstElementChild.children[1]
        //   parent.appendChild(model_tags)
        // }
      }
      else {
        if(flagged_tweets_flag){
          //console.log(alltweets[i].parentElement.parentElement.parentElement)
          alltweets[i].parentElement.parentElement.parentElement.remove()
        }
      }
    }
    flagged_tweets_flag = false
  }

  //  ////console.log(tweet_array)

  // for(j=0;j<flagged_tweets.length;j++){
  //   ////console.log(flagged_tweets[j].tweet)
  //   if(flagged_tweets[j].tweet).includes()){
  //     index = tweet_array.indexOf(flagged_tweets[j].tweet)
  //     // ////console.log(index)
  //     alltweets[index].style.backgroundColor = "rgba(252, 66, 123,0.1)";
  //   }

  //}

}

// function highlightAbusivePosts(abusive_list) {
//   var alltweets = document.querySelectorAll(".tweet-text");
//   for(i=0;i<alltweets.length;i++)
//   {
//     var tweet = alltweets[i].innerText.toLowerCase();
//     for(j=0;j<abusive_list.length;j++){
//       var reg = new RegExp("\\b" + abusive_list[j] + "\\b", 'i')
//       if(reg.test(tweet))
//       {
//         tweet =  tweet.replace(abusive_list[j], "<span><strong><u>" + abusive_list[j] +"</u></strong></span>");
//         alltweets[i].innerHTML = tweet;
//         alltweets[i].style.backgroundColor = "rgba(252, 66, 123,0.1)";
//       }
//     }
//   }
// }

function sendUsersToPredict(){
    var list = document.querySelectorAll("div.stream-item-header");
    //console.log(list.length)
    for(i=0;i<list.length;i++){
      let username = list[i].querySelector("a > .username.u-dir.u-textTruncate");
      //add_loader(list[i]);
      if(username){
      //  console.log(username.innerText.substring(1,username.length));
        get_score(username.innerText.substring(1,username.length), highlightUser,list[i])

      }
    }
}


function highlightUser(response_json, domelement){
  response_json = JSON.parse(response_json);
  console.log('highlightUser  ' + response_json.screen_name + ' ' + response_json.user_consensus_score);
  if(response_json.user_consensus_score > 0.2){
    domelement.querySelector("a > img.avatar.js-action-profile-avatar").style.border = '4px solid rgb(252, 66, 123)';
  }
}

function loader(parentElement){

  let childEle = document.createElement("span");
  childEle.className = "lds-ellipsis";
  childEle.innerText = "Hey"
  console.log(childEle);
  parentElement.appendChild(childEle);  
  console.log(parentElement);
  for(i=0;i<4;i++){
    let innerChildEle = document.createElement("div");
    innerChildEle.appendChild(childEle);
  }

}


function addFlagging(){
  if(document.getElementById('flagAccount')==null){
    flagButton = document.createElement('button');
    flagButton.id = 'flagAccount'
    flagButton.setAttribute('style', 'font-size:1em; background-color:#657786; padding:3px; margin-top: 3px; margin-bottom: 3px;')
    document.getElementsByClassName('ProfileHeaderCard')[0].insertBefore(flagButton, document.getElementsByClassName('ProfileHeaderCard-bio u-dir')[0])
    document.getElementById('flagAccount').style.color  = 'white';
    flagButton.innerHTML = ' Provide feedback about the result '
    flagButton.onmouseover = function(){
      this.style.backgroundColor = 'rgba(131, 156, 182, 1)'
    }
    flagButton.onmouseout = function(){
      this.style.backgroundColor = '#657786'
    }

  }
  console.log('flag account function')
  console.log(status)

}

function changeAvi() {
  let container = document.getElementsByClassName("ProfileAvatar-container")[0];      //Get parent of Profile Avatar
  let avi = document.getElementsByClassName("ProfileAvatar-image");                   //Get current avatar if you want to modify it at all
  var clone = document.createElement("img");                                          // Create image that will be the overlay
  clone.classList.add("ProfileAvatar-image");
  clone.src = chrome.extension.getURL("bad-mouth.png");
  clone.style.opacity = "0.9";
  container.appendChild(clone);
}



/*
Code for visualizing flagged tweets tab
*/
function addTab(){
  // if(!document.querySelector('ProfileHeading-toggleLink js-nav flagged-tweets')){

  if(document.getElementsByClassName('ProfileHeading-toggleLink js-nav flagged-tweets').length == 0){
    let tab_header = document.querySelector('.ProfileHeading-toggle')
    let new_tab = document.createElement('li')
    new_tab.className = "ProfileHeading-toggleItem  u-textUserColor"
    let new_href = document.createElement('button')
    // let new_href = document.createElement('a')
    new_href.className = "ProfileHeading-toggleLink js-nav flagged-tweets"
    new_href.innerText = "Flagged Tweets"
    // new_href.href = 'https://twitter.com/im__jane'
    new_tab.appendChild(new_href)
    tab_header.appendChild(new_tab)
  }

  flagged_tweets_tab = document.querySelector(".ProfileHeading-toggleLink.js-nav.flagged-tweets");
  flagged_tweets_tab.addEventListener('click',function(){
  if(window.location.href == "https://twitter.com/im__jane/with_replies" || window.location.href == "https://twitter.com/im__jane/media"){
    console.log('AT REPLY OR MEDIA')

  }

  //deactivate active tab
  if(flagged_tweets_tab.parentElement.parentElement.children.length){
    var childrenElements = flagged_tweets_tab.parentElement.parentElement.children;
    for(i=0;i<childrenElements.length;i++){
      if(childrenElements[i].classList.contains("is-active")){
        childrenElements[i].classList.remove("is-active")
        childrenElements[i].classList.add("u-textUserColor")
        // have to change the inner HTML to below
        userID = findUserId(document);
        // in case it's the first one
        if(i==0){
          childrenElements[i].innerHTML = '<a class="ProfileHeading-toggleLink js-nav" href="/' + userID + '" data-nav="tweets_toggle"> Tweets </a>'
        }else if (i==1){
          childrenElements[i].innerHTML = '<a class="ProfileHeading-toggleLink js-nav" href="/' + userID + '/with_replies" data-nav="tweets_with_replies_toggle">Tweets &amp; replies </a>'
        }else if (i==2){
          childrenElements[i].innerHTML = '<a class="ProfileHeading-toggleLink js-nav" href="/' + userID + '/media" data-nav="photos_and_videos_toggle"> Media </a>'
        }
      }
    }
  }

  //activate flagged tweets button
  flagged_tweets_tab.parentElement.classList.add("is-active");
  flagged_tweets_tab.parentElement.classList.remove("u-textUserColor");

  //console.log('here')
  flagged_posts =[]

  var alltweets = document.querySelectorAll(".tweet-text");
  console.log(alltweets.length)
  console.log(flagged_tweets.length)


  for(i=0;i<alltweets.length;i++){
    var tweet = alltweets[i].innerText;
    // tweet = tweet.replace(/(?:https?|www):\/\/[\n\S]+/g, '')
    // tweet =tweet.replace(/\W+/g," ")
    // tweet = tweet.toLowerCase().trim()
    // //console.log(flagged_tweets)
    for(j=0;j<flagged_tweets.length;j++){
      if(flagged_tweets[j]["original_tweet_text"].includes(tweet)){
        flagged_posts.push(alltweets[i].closest(".js-stream-item.stream-item.stream-item"))
         // if(document.getElementById('model-tag-'+j)==null){
           // var model_tags = document.createElement('span')
           // model_tags.innerHTML = flagged_tweets[j].models_that_agree
           // model_tags.id = "model-tag-"+j
           // model_tags.style.color =  "#e0245e"
           //////console.log(model_tags)
           // var parent = alltweets[i].parentElement.parentElement.firstElementChild.children[1]
           // parent.appendChild(model_tags)
         // }
      }
    } 
  }

  // console.log(flagged_posts)
  if(document.getElementById("flagged-tweets-stream")){
    document.getElementById("flagged-tweets-stream").style.display = "block";
    document.getElementById("stream-items-id").style.display = "none";
  } else {
  //else if(document.querySelector("#stream-items-id")){

    var element = document.getElementById("stream-items-id");
    parentNode = element.parentNode
    element.style.display="none";
    // element.parentNode.removeChild(element);

    // looping through children wasnt removing all posts
    var reCreateElement = document.createElement("ol");
    // reCreateElement.id = "stream-items-id";
    reCreateElement.className ="stream-items js-navigable-stream";
    reCreateElement.id = "flagged-tweets-stream"
    parentNode.insertBefore(reCreateElement, parentNode.firstChild);
    if(document.querySelector(".timeline-end.has-items.has-more-items"))
      document.querySelector(".timeline-end.has-items.has-more-items").remove()

    for(i=0;i<flagged_posts.length;i++){
      // console.log(flagged_posts[i])
      reCreateElement.appendChild(flagged_posts[i])
    }

    // if(flagged_posts.length){
    //   flagged_posts.forEach(function(item){
    //     reCreateElement.appendChild(item)
    //   })
    // }
}

});
}



// have to add responses to other tabs
var childrenElements = flagged_tweets_tab.parentElement.parentElement.children;
console.log(childrenElements)
console.log(childrenElements.length)
childrenElements[0].addEventListener('click',function(){
    console.log('test if childrenElements exist')
    var childrenElements = flagged_tweets_tab.parentElement.parentElement.children;
    console.log(childrenElements)
    console.log(childrenElements[0])
     //deactivate the flagged_tweets tab if it's activated
    if(flagged_tweets_tab.parentElement.classList.contains("is-active")){
      flagged_tweets_tab.parentElement.classList.remove("is-active");
      flagged_tweets_tab.parentElement.classList.add("u-textUserColor");
      document.getElementById("flagged-tweets-stream").style.display = "none";
      console.log(childrenElements[0])
    }
    childrenElements[0].classList.add("is-active");
    childrenElements[0].classList.remove("u-textUserColor");
    childrenElements[0].innerHTML = '<span aria-hidden="true">Tweets</span> <span class="u-hiddenVisually">Tweets, current page.</span>';
    document.getElementById("stream-items-id").style.display = "block";
  });

// Need to do something for the 2nd, 3rd
childrenElements[1].addEventListener('click',function(){
  r = new RegExp('replies$')
  console.log('testing tweet&reply tab')
  var replyTabcheckInterval = setInterval(addTabForChange, 1000);
  function addTabForChange(){
    if(r.exec(window.location.href)){
      console.log('reached tweet&reply page')
      addTab();
    }else{
      console.log('didnt match')
      clearInterval(replyTabcheckInterval);
    }
  }
  

});

childrenElements[2].addEventListener('click',function(){
  r = new RegExp('media$')
  console.log('testing media tab')
  var mediaTabcheckInterval = setInterval(addTabForChange, 1000);
  function addTabForChange(){
    if(r.exec(window.location.href)){
      console.log('reached media page')
      addTab();
    }else{
      console.log('didnt match')
      clearInterval(mediaTabcheckInterval);
    }
  }
  

});

// function visualizeTicksOnTimeline(){

  // let beforele = document.getElementsByClassName("ProfileTweet-action ProfileTweet-action--more js-more-ProfileTweet-actions");
  // let childEle = document.createElement("span");
  // childEle.className = "lds-ellipsis";
  // let div1 = document.createElement("div");
  // let div2 = document.createElement("div");
  // let div3 = document.createElement("div");
  // let div4 = document.createElement("div");

  // childEle.appendChild(div1);
  // childEle.appendChild(div2);
  // childEle.appendChild(div3);
  // childEle.appendChild(div4);

  // let parentEle = document.querySelector("div.stream-item-header");

  // parentEle.insertBefore(childEle,beforele[0]);

// }