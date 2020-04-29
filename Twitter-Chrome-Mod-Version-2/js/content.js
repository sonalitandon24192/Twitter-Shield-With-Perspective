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

// call checkForJS_Finish() as init()
// window.onload = checkForJS_Finish()

// var URL_HEADER = 'http://127.0.0.1:8000'
var URL_HEADER = 'https://twitter-shield.si.umich.edu'

var userID;
var accountName='';
var currentTab;
var item, abusive_list; // jSON returned from server. Making it public for highlighting abusive words on lazy loading
// var stranger_list = [];

var ignoreURLs = ["https://twitter.com/i/bookmarks", 
                "/lists", "https://twitter.com/messages",
                "https://twitter.com/explore", "/status/", 
                "/home", "notifications", 
                "/compose/tweet", '/search?q'
                ]

// var notificationQueueString = localStorage.notificationQueue
// notificationQueueString = (notificationQueueString ) ? notificationQueueString : '{}'
// notificationQueue = JSON.parse(notificationQueueString)
// console.log(notificationQueue)
var notificationQueue = {}

// var timelineQueueString = localStorage.timelineQueue
// timelineQueueString = (timelineQueueString ) ? timelineQueueString : '{}'
// timelineQueue = JSON.parse(timelineQueueString)
// console.log(timelineQueue)

var timelineQueue = {}

var withRepliesRegex = new RegExp('/with_replies'+"$")
var mediaRegex = new RegExp('/media'+"$")
var likesRegex = new RegExp('/likes'+"$")

console.log('LOCAL STORAGE')
var profileStrangerString = localStorage.profileStrangers
var flaggedTweetsString = localStorage.flaggedTweets
var flaggedCredTweetsString = localStorage.flaggedCredTweets

var currentPage = '';

//global variables common to hometimeline/notificationtweets
var global_tweetcount = 0;
var threshold;
var statusDiv;
var exampleTweets;

//styles
var toxicUserBorderStyle = '';
var computingBorderStyle = '';
var safeUserBorderStyle = '';
var notEnoughTweetsBorderStyle = '';

var toxicityStatusDiv = '';

// var TWEET_TOXIC_BOUNDARY = 0.8

var TOXIC_BOUNDARY;
var CRED_BOUNDARY;

chrome.storage.local.get(['toxicThreshold'], function(result) {
  if(result.toxicThreshold != null){
    TOXIC_BOUNDARY = result.toxicThreshold
  }else{
    TOXIC_BOUNDARY = 0.08
  }
  console.log(TOXIC_BOUNDARY)
  console.log(result.toxicThreshold)
});

chrome.storage.local.get(['misinfoThreshold'], function(result) {
  if(result.misinfoThreshold != null){
    CRED_BOUNDARY = result.misinfoThreshold
  }else{
    CRED_BOUNDARY = 0.02
  }
  console.log(CRED_BOUNDARY)
  console.log(result.misinfoThreshold)
});

console.log(CRED_BOUNDARY)
console.log(TOXIC_BOUNDARY)
console.log('=========================')
var loggedIn = false;

var followingListString = localStorage.followingList



window.addEventListener('storage', (e) => {
   console.log(`Key Changed: ${e.key}`);
   console.log(`New Value: ${e.newValue}`);
});

chrome.storage.onChanged.addListener(function(changes, namespace){
  for (var key in changes) {
    var storageChange = changes[key];
    console.log(storageChange.oldValue)
    console.log(storageChange.newValue)
    if(key=='misinfoThreshold'){
      CRED_BOUNDARY = storageChange.newValue
      localStorage.setItem('misinfoThreshold', storageChange.newValue)
    }else if (key=='toxicThreshold') {
      TOXIC_BOUNDARY = storageChange.newValue
      localStorage.setItem('toxicThreshold', storageChange.newValue)
    }else if (key=='accountName'){
      localStorage.setItem('accountName', storageChange.newValue)
    }
  }
})

function getCurrentAccount(){
  return localStorage.getItem('accountName')
}

function getFollowingList(accountName){
  console.log('following list')
  console.log(accountName)
  if(accountName in followingList){
    console.log('already in')
  }else{
    var url = URL_HEADER + "/get_following?user=" + accountName;
    var request = new XMLHttpRequest();
    request.onreadystatechange = function(){
        if (request.readyState == 4 && request.status == 200){
            console.log('returned: ' + request.responseText)
            var response_json = JSON.parse(request.responseText);
            //flagged_tweets = response_json.flagged_tweets
            var thisFollowing = response_json['following']
            followingList[accountName] = thisFollowing
            localStorage.setItem('followingList', JSON.stringify(followingList))
            console.log(followingList)
        }
    };
    request.open('GET', url);
    request.send();

  }
}


function checkIfFollowing(pageID, accountName){
  if(pageID in followingList[accountName]){
    return true
  }else{
    return false
  }
}

$(window).on('load',function(){
  console.log(currentPage)
  console.log(window.location.href)

  createCssClasses()
  setLocalStorage()


  if(localStorage.getItem('threshold') != null){
    // console.log('not null!')
    threshold = localStorage.getItem('threshold');
  }else{
    // build popup
    localStorage.setItem('threshold', 0.3);
    threshold = localStorage.getItem('threshold');
    console.log('set threshold as default for now')
  }


  if(localStorage.getItem('accountName') != null){
    // console.log('not null!')
    accountName = getCurrentAccount();
  }

  if(accountName != '' && accountName != null){
    getFollowingList(accountName)
    if(currentPage != window.location.href){
      if(document.location.href == 'https://twitter.com/home') {
        currentPage = document.location.href 
      }else if(document.location.href == 'https://twitter.com/notifications' || document.location.href == 'https://twitter.com/notifications/mentions') {
        currentPage = document.location.href 
      }else if(document.location.href =='https://twitter.com/messages'){
        currentPage = document.location.href 
      }else if(! ignoreURL(window.location.href)){
        console.log('likely profile page')
        currentPage = window.location.href
        // console.log('window.location: '+ window.location.href)
        $(document).arrive('[data-testid="UserProfileHeader_Items"]', function(){
          // console.log('new version of twitter- profile page')
          var thisPageID = currentPage.replace('https://twitter.com/', '')
          var result = checkTabWithinProfile(thisPageID)
          thisPageID = result[0]
          thisTab = result[1]
          // console.log(thisPageID)
          // console.log(userID)
          // if (thisPageID != userID || thisTab != currentTab){
          if (thisTab != currentTab && ! (followingList[accountName].includes(thisPageID))){
            // update current page or/and tab
            userID = thisPageID;
            currentTab = thisTab;
            console.log(userID)
            if(thisPageID in profileStrangers){
              // toxicity
              var thisScore = profileStrangers[thisPageID]['toxicity']
              var accountFlaggedTweets = flaggedTweets[thisPageID]
              changeBioElement(thisPageID, thisScore, accountFlaggedTweets)
              // credibility
              var credScore = profileStrangers[thisPageID]['uncrediblity']
              var accountCredFlaggedTweets = flaggedCredTweets[thisPageID]
              changeBioCrediblityStatus(thisPageID, credScore, accountCredFlaggedTweets)
              // bio color
              changeBorderColor(thisScore, credScore, userID)
            }else{
              getProfileScore(thisPageID, pollStatusNewTwitter);
            }
          }
        })     
      }
    }
    
  }
  // periodically call the following
    var jsTimerForURLChange = setInterval(checkProfile, 2000);
    var notificationTimelineChecker = setInterval(checkNotificationTimeline, 5000)  
  

});


// this visualizes flagged tweets when scrolling 
window.onscroll = function(ev) {

  accountName = getCurrentAccount()

  if(accountName != '' && accountName != null){
    // getFollowingList(accountName)
    if(followingList[accountName] != null){
      if(document.location.href == 'https://twitter.com/home') {
        global_tweetcount = 0
        sendUsersToPredictTimelineNewTwitter()
        userID = '';
      }else if(document.location.href == 'https://twitter.com/notifications') {
        sendUsersToPredictNotificationNewTwitter()
        userID = '';
      }else if(document.location.href =='https://twitter.com/messages'){

      }
    }
  }
};


function checkProfile() {
  console.log('check profile')
  accountName = getCurrentAccount();
  if(accountName != '' && accountName != null){
    if(currentPage != window.location.href){
      console.log('diff')
      if(document.location.href == 'https://twitter.com/home') {
        currentPage = document.location.href 
        userID = '';
      }else if(document.location.href == 'https://twitter.com/notifications' || document.location.href == 'https://twitter.com/notifications/mentions') {
        currentPage = document.location.href 
        userID = '';
      }else if(document.location.href =='https://twitter.com/messages'){
        currentPage = document.location.href 
        userID = '';
      }else if(! (ignoreURL(window.location.href))){
        console.log('likely profile page')
        if(document.getElementById('toxicityStatus')!=null){
          document.getElementById('toxicityStatus').innerText = '';
        }
        
        // document.querySelectorAll('.css-1dbjc4n.r-14lw9ot.r-11mg6pl.r-sdzlij.r-1phboty.r-14f9gny.r-1gzrgec.r-cnkkqs.r-1udh08x.r-13qz1uu')[0].style.borderColor = ''
        if(document.querySelectorAll('[data-testid="UserProfileHeader_Items"]').length>0){
          currentPage = window.location.href
          var thisPageID = currentPage.replace('https://twitter.com/', '')
          var result = checkTabWithinProfile(thisPageID)
          thisPageID = result[0]
          thisTab = result[1]

          console.log(thisPageID)
          console.log(userID)

          if (thisPageID != userID || thisTab != currentTab){
            userID = thisPageID;
            currentTab = thisTab;
            initializeBorderColor(thisPageID)
            if(! (followingList[accountName].includes(thisPageID))){
              if(thisPageID in profileStrangers){
                // toxicity
                var thisScore = profileStrangers[thisPageID]['toxicity']
                var accountFlaggedTweets = flaggedTweets[thisPageID]
                changeBioElement(thisPageID, thisScore, accountFlaggedTweets)
                // credibility
                var credScore = profileStrangers[thisPageID]['uncrediblity']
                console.log(flaggedTweets)
                var accountCredFlaggedTweets = flaggedCredTweets[thisPageID]
                changeBioCrediblityStatus(thisPageID, credScore, accountCredFlaggedTweets)
                changeBorderColor(thisScore, credScore, userID)
              }else{
                getProfileScore(thisPageID, pollStatusNewTwitter);
              }  
            }
          }
        }
      }
    }
  }
}

function initializeBorderColor(thisPageID){
  if(document.querySelectorAll('[href="/' + thisPageID + '/photo"]').length > 0){
    document.querySelectorAll('[href="/' + thisPageID + '/photo"]')[0].querySelector('div').style.borderColor = '';
  }else{
    document.querySelector('a.r-15d164r.r-11wrixw.r-zjg7tu.r-mtrfb5.r-1xce0ei').querySelector('div').style.borderColor = '';
  }         
}

function createExampleCredibleTweets(thisID, accountUncredibleTweets, credScore){
  uncredibleTweets = document.createElement('div')
  uncredibleTweets.id = 'uncredibleTweets'
  uncredibleTweets.style = 'padding: 2px 3px; text-align: left; border-radius: 8px; background-color: rgb(230, 131, 69); text-decoration: none; display: inline-block; font-size: 0.8em; margin-right:10px; cursor: pointer; color:white;'
  uncredibleTweets.innerText += 'Example misinformation-source containing tweets'
  // if(document.getElementById('toxicityStatus') != null){
  //   document.getElementById('toxicityStatus').append(exampleTweets)
  // }
  if(document.getElementById('credDiv') != null){
    document.getElementById('credDiv').append(uncredibleTweets)
  }
  $('#uncredibleTweets').on('mouseover', function(){
    $(this).css('background-color', 'rgb(226, 114, 43)')
  })
  $('#uncredibleTweets').on('mouseout', function(){
    $(this).css('background-color', 'rgb(230, 131, 69)')
  })
  console.log(accountUncredibleTweets)
  addCredibilityModal(accountUncredibleTweets, thisID, credScore)
}

function createExampleTweetsButton(thisID, accountFlaggedTweets, toxicityScore){
  exampleTweets = document.createElement('div')
  exampleTweets.id = 'exampleTweets'
  exampleTweets.style = 'padding: 2px 3px; text-align: left; border-radius: 8px; background-color: #ca3e3eb0; text-decoration: none; display: inline-block; font-size: 0.8em; margin-right:10px; cursor: pointer; color:white;'
  exampleTweets.innerText = 'Example toxic tweets'
  // if(document.getElementById('toxicityStatus') != null){
  //   document.getElementById('toxicityStatus').append(exampleTweets)
  // }
  if(document.getElementById('toxicDiv') != null){
    document.getElementById('toxicDiv').append(exampleTweets)
  }
  $('#exampleTweets').on('mouseover', function(){
    $(this).css('background-color', 'rgba(208, 26, 26, 0.69)')
  })
  $('#exampleTweets').on('mouseout', function(){
    $(this).css('background-color', '#ca3e3eb0')
  })


  addToxicityModal(accountFlaggedTweets, thisID, toxicityScore);

}
   
function checkNotificationTimeline() {

  if(localStorage.getItem('accountName') != null){
    // console.log('not null!')
    accountName = localStorage.getItem('accountName');
  }

  if(accountName != ''){
    // getFollowingList(accountName)
    // console.log('notification timeline checker')
    if(document.location.href == 'https://twitter.com/home') {
      global_tweetcount = 0
      // console.log('timeline')
      sendUsersToPredictTimelineNewTwitter()
    }else if(document.location.href == 'https://twitter.com/notifications' || document.location.href == 'https://twitter.com/notifications/mentions') {
      // console.log('notification')
      sendUsersToPredictNotificationNewTwitter()
    }else if(document.location.href =='https://twitter.com/messages'){
    }
  }
  
}


function getProfileScore(username, callback) {
  accountName = getCurrentAccount()

  if (! (followingList[accountName].includes(username))){
    console.log('get_score')
    oauth_token = localStorage.getItem('oauth_token')
    oauth_token_secret = localStorage.getItem('oauth_token_secret')
    var url = URL_HEADER + "/toxicity_score_higher_threshold?user=" + username + '&threshold=' + threshold + '&oauth_token=' + oauth_token + '&oauth_token_secret=' + oauth_token_secret
    
    var request = new XMLHttpRequest();
    request.onreadystatechange = function(){
        if (request.readyState == 4 && request.status == 200){
            console.log('returned: ' + request.responseText)
            callback(request.responseText); // Another callback here
        }
    };
    console.log(url)
    request.open('GET', url);
    request.send();

  }
    
}


function getTimelineScores(username, callback, callback_input) {
    if(username in timelineQueue){
      // console.log(timelineQueue[username])
      timelineQueue[username].add(callback_input)
    }else{
      timelineQueue[username] = new Set([callback_input])
      // console.log(timelineQueue[username])
      localStorage.setItem('timelineQueue', JSON.stringify(timelineQueue))

      // var url = URL_HEADER + "/toxicityscore?user=" + username + '&threshold=' + threshold;
      oauth_token = localStorage.getItem('oauth_token')
      oauth_token_secret = localStorage.getItem('oauth_token_secret')
      
      var url = URL_HEADER + "/toxicity_score_higher_threshold?user=" + username + '&threshold=' + threshold + '&oauth_token=' + oauth_token + '&oauth_token_secret=' + oauth_token_secret
      
      var request = new XMLHttpRequest();
      request.onreadystatechange = function(){
          if (request.readyState == 4 && request.status == 200){
              // console.log('returned: ' + request.responseText)
              callback(request.responseText, callback_input); // Another callback here
          }
      };
      request.open('GET', url);
      request.send();
    }

}



function pollStatusNewTwitter(response){
  // console.log('called poll status in new Twitter!')
  console.log(response)
  var response_json = JSON.parse(response);
  //flagged_tweets = response_json.flagged_tweets
  var task_id = response_json['task_id']
  var screen_name = response_json['screen_name']
  var threshold = response_json['threshold']
  // var url = URL_HEADER + "/poll_status?task_id=" + task_id + '&screen_name=' + screen_name + '&threshold=' + threshold
  var url = URL_HEADER + "/poll_with_higher_threshold?task_id=" + task_id + '&screen_name=' + screen_name + '&threshold=' + threshold
  
  // var url = "http://twitter-shield.si.umich.edu/poll_status?task_id=" + task_id + '&screen_name=' + screen_name + '&threshold=' + threshold
  var request = new XMLHttpRequest();

  request.onreadystatechange = function(){
    if (request.readyState == 4 && request.status == 200){
      result = JSON.parse(request.responseText)
      console.log('poll status')
      console.log(result)
      // console.log(result)

      if (result['state'] == 'PENDING'){
        // console.log('pending')
        // console.log(request.responseText)
        var status = JSON.parse(request.responseText)['result']
        console.log(status)
        
        visualizeStatusNewTwitter(status)
        setTimeout(function(){pollStatusNewTwitter(response)}, 3000);

      }else if (result['state'] == 'SUCCESS' && result['result'] != 'FAILURE'){
        if (result['result'] == 'No tweets' || 'toxicity' in result['result'] || 'uncrediblity' in result['result']){
          // checkabusiveNewTwitter(request.responseText, screen_name)
          console.log(response)
          console.log(response_json['screen_name'])
          // 1.no tweets or 2.user scores
          changeBioAfterRequest(request.responseText, response_json['screen_name'])
        }else{
          //failed
          console.log(response)
          console.log(response_json['screen_name'])
          visualizeStatusNewTwitter('FAILURE')
        }
        
      }else {
        //failed
        console.log(response)
        console.log(response_json['screen_name'])
        visualizeStatusNewTwitter('FAILURE')

      }

    }
  };

  request.open('GET', url);
  request.send();
}


function changeBioAfterRequest(response, screen_name){
  var response_json = JSON.parse(response);
  console.log('beginning of changeBio')
  console.log(response_json)
  var prof = document.querySelector(".ProfileAvatar");
  console.log(response_json)
  if (response_json['result'] != 'No tweets'){
     // toxicity
    var accountFlaggedTweets = getFlaggedTweets(response_json)
    flaggedTweets[screen_name] = accountFlaggedTweets
    localStorage.setItem('flaggedTweets', JSON.stringify(flaggedTweets))
    //credibility
    var accountCredFlaggedTweets = getCredFlaggedTweets(response_json)
    flaggedCredTweets[screen_name] = accountCredFlaggedTweets
    localStorage.setItem('flaggedCredTweets', JSON.stringify(flaggedCredTweets))
  }
 

  if(response_json['result'] == 'No tweets'){
    var score = -1
    var credScore = -1
    changeBioElement(screen_name, -1, accountFlaggedTweets)
  }else{
    var score = response_json['result']['toxicity']['TOXICITY']['score']
    var credScore = response_json['result']['uncrediblity']['uncrediblity']
  }

  if(score != null){
    console.log('init!')
    createStatusDiv();
    //first initialize
    document.getElementById('toxicityStatus').innerHTML = '';
    //then change
    changeBioElement(screen_name, score, accountFlaggedTweets)
    changeBioCrediblityStatus(screen_name, credScore, accountCredFlaggedTweets)
    changeBorderColor(score, credScore, screen_name)
    //store
    storeLocally(screen_name, score, credScore)
  }
  
}

function getFlaggedTweets(response_json, screen_name){
  console.log("GET FLAGGED TWEETS!!!!")
  console.log(response_json)
  var accountFlaggedTweets = []
  // if(response_json['result']!=null){
    if(response_json['result']!='FAILURE' && response_json['result']!= 'No tweets'){
      if('toxicity' in response_json['result'] && 'tweets_with_scores' in response_json['result']['toxicity']){
        var thisUserTweets = response_json['result']['toxicity']['tweets_with_scores']
      // console.log(thisUserTweets)
      console.log(thisUserTweets)
      console.log(thisUserTweets.length)

        for(i=0; i<thisUserTweets.length; i++){
            accountFlaggedTweets.push([thisUserTweets[i]['tweet_text'], thisUserTweets[i]['tweet_created_at']])
            console.log(thisUserTweets[i]['tweet_text'])
        }
      }
    }
 
    
  return accountFlaggedTweets
}

function getCredFlaggedTweets(response_json, screen_name){
  console.log('store cred tweets')
  var accountCredFlaggedTweets = []
  // if(response_json['result']!=null){
  if(response_json['result']!='FAILURE' && response_json['result']!= 'No tweets'){
    if('uncrediblity' in response_json['result'] && 'tweets_with_scores' in response_json['result']['uncrediblity']){
      var thisUserTweets = response_json['result']['uncrediblity']['tweets_with_scores']
        // console.log(thisUserTweets)
      for(i=0; i<thisUserTweets.length; i++){
        if(parseFloat(thisUserTweets[i]['uncrediblity']) > 0){
          console.log(thisUserTweets[i])
          console.log(thisUserTweets[i]['urls'])
          accountCredFlaggedTweets.push([thisUserTweets[i]['tweet_text'], thisUserTweets[i]['urls'], thisUserTweets[i]['tweet_created_at']])
          console.log(thisUserTweets[i]['tweet_text'])
        }
      }
    }
  }
  return accountCredFlaggedTweets
}


function visualizeStatusNewTwitter(status){
  console.log('visualizeStatus function')
  if (document.getElementById("toxicityStatus")==null) {
    console.log('add toxicityStatus')
    toxicityStatusDiv = document.createElement('div');
    toxicityStatusDiv.id = 'toxicityStatus'
    toxicityStatusDiv.setAttribute('style', 'font-size:1.2em; padding:1px;')
    if(document.querySelector('[data-testid="UserDescription"]') != null){
      document.querySelector('[data-testid="UserDescription"]').parentElement.insertBefore(toxicityStatusDiv, document.querySelector('[data-testid="UserDescription"]'))
    }else if(document.querySelector('[data-testid="UserProfileHeader_Items"]') != null){
      document.querySelector('[data-testid="UserProfileHeader_Items"]').parentElement.insertBefore(toxicityStatusDiv, document.querySelector('[data-testid="UserProfileHeader_Items"]'))
    }  
  }
  toxicityStatusDiv = document.getElementById('toxicityStatus')
  
  if (status == 'started'){
    toxicityStatusDiv.innerHTML = ' Pending... '
    toxicityStatusDiv.style.color = 'rgba(29,161,242,1.00)';
  }else if (status == 'FAILURE'){
    console.log(status)
    toxicityStatusDiv.innerHTML = 'This account cannot be analyzed due to API limitation.';
    toxicityStatusDiv.style.color = 'rgba(242,29,50,1.00)';

  }else if (status == 'LAG'){
    console.log("LAG")
    toxicityStatusDiv.innerHTML = ' Pending... '
    toxicityStatusDiv.style.color = 'rgba(29,161,242,1.00)';
  }else{
    // statusDiv.innerHTML = status + ' stored'
    toxicityStatusDiv.innerHTML = ' Pending... '
    toxicityStatusDiv.style.color = 'rgba(29,161,242,1.00)';
  }
}


function appendToxicDiv(statusDiv){
  statusDiv.innerHTML = ""
  var toxicDiv = document.createElement('span');
  toxicDiv.id = 'toxicSpan'
  toxicDiv.innerHTML = "Toxicity"
  toxicDiv.style = 'padding: 2px 3px; text-align: center; border-radius: 8px; background-color: #ca3e3eb0; text-decoration: none; display: inline-block; font-size: 0.7em; margin-right:10px; cursor: pointer; color:white; font-family: sans-serif;'
  // if(document.getElementById('toxicityStatus') != null){
  //   document.getElementById('toxicityStatus').append(exampleTweets)
  // }
  statusDiv.append(toxicDiv)
  $('#toxicSpan').on('mouseover', function(){
    $(this).css('background-color', 'rgba(208, 26, 26, 0.69)')
  })
  $('#toxicSpan').on('mouseout', function(){
    $(this).css('background-color', '#ca3e3eb0')
  })

  
}

function appendUncredibleDiv(statusDiv){ 
  // statusDiv.innerHTML = ""
  var credDiv = document.createElement('span');
  credDiv.id = 'credSpan'
  credDiv.innerHTML = "Misinformation"
  credDiv.style = 'padding: 2px 3px; text-align: center; border-radius: 8px; background-color: rgb(230, 131, 69); text-decoration: none; display: inline-block; font-size: 0.7em; margin-right:10px; cursor: pointer; color:white; font-family: sans-serif;'
  // if(document.getElementById('toxicityStatus') != null){
  //   document.getElementById('toxicityStatus').append(exampleTweets)
  // }
  statusDiv.append(credDiv)
  $('#credSpan').on('mouseover', function(){
    $(this).css('background-color', 'rgba(240, 105, 7, 1)')
  })
  $('#credSpan').on('mouseout', function(){
    $(this).css('background-color', 'rgb(230, 131, 69)')
  })
}

function changeBioElement(thisID, score, accountFlaggedTweets){
  createStatusDiv();
  toxicityStatusDiv = document.getElementById('toxicityStatus')
  console.log(toxicityStatusDiv)

  if(score > TOXIC_BOUNDARY){
    //new fucntion for appending
    appendToxicDiv(toxicityStatusDiv)
    if(document.querySelectorAll('[href="/' + thisID + '/photo"]').length > 0){
      document.querySelectorAll('[href="/' + thisID + '/photo"]')[0].querySelector('div').style.borderColor = 'rgb(250, 21, 130)';
    }else{
      document.querySelector('a.r-15d164r.r-11wrixw.r-zjg7tu.r-mtrfb5.r-1xce0ei').querySelector('div').style.borderColor = 'rgb(250, 21, 130)';
    }
    
    createExampleTweetsButton(thisID, accountFlaggedTweets, score)

  }else if(score == -1){
    toxicityStatusDiv.innerHTML = 'This account is protected or does not have enough English tweets.'
    toxicityStatusDiv.style.color = 'rgba(29,161,242,1.00)';
    if(document.querySelectorAll('[href="/' + thisID + '/photo"]').length > 0){
      document.querySelectorAll('[href="/' + thisID + '/photo"]')[0].querySelector('div').style.borderColor = '';
    }else{
      document.querySelector('a.r-15d164r.r-11wrixw.r-zjg7tu.r-mtrfb5.r-1xce0ei').querySelector('div').style.borderColor = '';
    }
    console.log("NO TWEETS BRUTH")
    
  }else if(score < TOXIC_BOUNDARY){
    // toxicDiv = document.getElementById('toxicDiv')
    // toxicDiv.innerHTML = ""
    // toxicDiv.style.color = '';
    if(document.getElementById('toxicSpan')!=null){
      document.getElementById('toxicSpan').remove()
    }
  }

}

function changeBorderColor(toxicScore, credScore, thisID){
  if(toxicScore > TOXIC_BOUNDARY || credScore > CRED_BOUNDARY){
    if(document.querySelectorAll('[href="/' + thisID + '/photo"]').length > 0){
      document.querySelectorAll('[href="/' + thisID + '/photo"]')[0].querySelector('div').style.borderColor = 'rgb(250, 21, 130)';
    }else{
      document.querySelector('a.r-15d164r.r-11wrixw.r-zjg7tu.r-mtrfb5.r-1xce0ei').querySelector('div').style.borderColor = 'rgb(250, 21, 130)';
    }
  }else{
    if(document.querySelectorAll('[href="/' + thisID + '/photo"]').length > 0){
      // document.querySelectorAll('[href="/' + thisID + '/photo"]')[0].querySelector('div').style.borderColor = '#5aca7f';
      document.querySelectorAll('[href="/' + thisID + '/photo"]')[0].querySelector('div').style.borderColor = '';
    }else{
        // document.querySelector('a.r-15d164r.r-11wrixw.r-zjg7tu.r-mtrfb5.r-1xce0ei').querySelector('div').style.borderColor = '#5aca7f';
        document.querySelector('a.r-15d164r.r-11wrixw.r-zjg7tu.r-mtrfb5.r-1xce0ei').querySelector('div').style.borderColor = '';
    }
  }
  
}

function createStatusDiv(){
  if (document.getElementById("toxicityStatus") == null) {
    // console.log('insert status div')
    toxicityStatusDiv = document.createElement('div');
    toxicityStatusDiv.id = 'toxicityStatus'
    toxicityStatusDiv.setAttribute('style', 'font-size:1.2em; padding:1px;')
    if(document.querySelector('[data-testid="UserDescription"]') != null){
      document.querySelector('[data-testid="UserDescription"]').parentElement.insertBefore(toxicityStatusDiv, document.querySelector('[data-testid="UserDescription"]'))
    }else{
      document.querySelector('[data-testid="UserProfileHeader_Items"]').parentElement.insertBefore(toxicityStatusDiv, document.querySelector('[data-testid="UserProfileHeader_Items"]'))
    }
  }
}

function changeBioCrediblityStatus(thisID, credScore, accountUncredibleTweets){
  createStatusDiv();
  toxicityStatusDiv = document.getElementById('toxicityStatus')
  console.log("CRED BOUNDARY ")
  console.log(CRED_BOUNDARY)
  console.log(credScore)
  if(credScore > CRED_BOUNDARY){
      appendUncredibleDiv(toxicityStatusDiv)

      if(document.querySelectorAll('[href="/' + thisID + '/photo"]').length > 0){
        document.querySelectorAll('[href="/' + thisID + '/photo"]')[0].querySelector('div').style.borderColor = 'rgb(250, 21, 130)';
      }else{
        document.querySelector('a.r-15d164r.r-11wrixw.r-zjg7tu.r-mtrfb5.r-1xce0ei').querySelector('div').style.borderColor = 'rgb(250, 21, 130)';
      }

      createExampleCredibleTweets(thisID, accountUncredibleTweets, credScore)
      
    }else if(credScore == -1){
      // toxicityStatusDiv.innerHTML = 'This user does not have enough English tweets.'
      toxicityStatusDiv.innerHTML = ''
      toxicityStatusDiv.style.color = 'rgba(29,161,242,1.00)';
      if(document.querySelectorAll('[href="/' + thisID + '/photo"]').length > 0){
        document.querySelectorAll('[href="/' + thisID + '/photo"]')[0].querySelector('div').style.borderColor = '';
      }else{
        document.querySelector('a.r-15d164r.r-11wrixw.r-zjg7tu.r-mtrfb5.r-1xce0ei').querySelector('div').style.borderColor = '';
      }
      console.log("NO TWEETS BRUTH")
      
    }else if(credScore < CRED_BOUNDARY){
      if(document.getElementById('credSpan')!=null){
        document.getElementById('credSpan').remove()
      }
    }
  
}



function storeLocally(screen_name, toxicityScore, credScore){
  if(!(screen_name in profileStrangers)){
    profileStrangers[screen_name] = {}
  }
  profileStrangers[screen_name]['toxicity'] = toxicityScore
  profileStrangers[screen_name]['uncrediblity'] = credScore
  console.log('store!')
  console.log(profileStrangers[screen_name])
  localStorage.setItem('profileStrangers', JSON.stringify(profileStrangers))
}

function sendUsersToPredictNotificationNewTwitter(){
  accountName = getCurrentAccount();
  if(accountName != '' && accountName != null){
    console.log('notification')
    // var notificationPage = document.querySelectorAll('.css-1dbjc4n.r-1jgb5lz.r-1ye8kvj.r-6337vo.r-13qz1uu')
    var notificationPage = document.querySelectorAll('[aria-label="Timeline: Notifications"]')
    if (notificationPage.length > 0){
      var notifySections = notificationPage[0].querySelectorAll('.css-1dbjc4n.r-my5ep6.r-qklmqi.r-1adg3ll')
      
      for(var i=0; i<notifySections.length; i++){
        var userCandidates = notifySections[i].querySelectorAll('a')
        for(var j=0; j<userCandidates.length; j++){
          var can = userCandidates[j]
          if(can.querySelectorAll('img').length == 1){
            var canId = userCandidates[j].href.replace("https://twitter.com/", '')
            if(! (followingList[accountName].includes(canId))){
              var divToColor = userCandidates[j].querySelector('.css-1dbjc4n.r-sdzlij.r-1p0dtai.r-1mlwlqe.r-1d2f490.r-1udh08x.r-u8s1d.r-zchlnj.r-ipm5af.r-417010')
              if(divToColor!=null){
                if(canId in profileStrangers){
                  // console.log('from localstraoge')
                  var thisScore = profileStrangers[canId]['toxicity']
                  var thisCredScore = profileStrangers[canId]['uncrediblity']
                  // if(thisScore > threshold){
                  if(thisScore > TOXIC_BOUNDARY || thisCredScore > CRED_BOUNDARY){
                    divToColor.classList.add('toxicUser')
                  }else if(thisScore < 0){
                    divToColor.classList.add('notEnoughTweets')
                  }else if(0 < thisScore && thisScore < TOXIC_BOUNDARY && thisCredScore < CRED_BOUNDARY){
                    divToColor.classList.add('safeUser')
                  }
                }else{
                  //signal that we started to compute
                  // console.log('outside localStorage')
                  // divToColor.style.border ='3px solid #42a5fc';
                  if(divToColor.classList.contains('toxicUser') || divToColor.classList.contains('safeUser') || divToColor.classList.contains('notEnoughTweets')){
                    divToColor.classList.remove('computing')
                  }else{
                    divToColor.classList.add('computing')
                    getNotificationScores(canId, pollInNotification, userCandidates[j])
                  }
                  
                }
              }
            }else{
              // console.log('following!')
            }
            
          }
          
        }
      }
    }
  }
}

function sendUsersToPredictTimelineNewTwitter(){
  accountName = getCurrentAccount();
  if(accountName != '' && accountName != null){
    var timelinePage = document.querySelectorAll('[aria-label="Timeline: Your Home Timeline"]')
    if (timelinePage.length > 0){
      var timelineSections = timelinePage[0].querySelectorAll('[data-testid="tweet"]')
    
      // console.log(timelineSections)
      for(var i=0; i< timelineSections.length; i++){
        var userCandidate = timelineSections[i].querySelector('a')
        var canId = userCandidate.href.replace("https://twitter.com/", '')
        // console.log(canId)
        if(! followingList[accountName].includes(canId)){

          //signal that we started to compute
          var divToColor = timelineSections[i].querySelector('.css-1dbjc4n.r-sdzlij.r-1p0dtai.r-1mlwlqe.r-1d2f490.r-1udh08x.r-u8s1d.r-zchlnj.r-ipm5af.r-417010')
          if(divToColor!=null){
            // divToColor.style.border ='3px solid #42a5fc';
            if(canId in profileStrangers){
                // console.log('from localstraoge')
                var thisScore = profileStrangers[canId]['toxicity']
                var thisCredScore = profileStrangers[canId]['uncrediblity']
                // if(thisScore > threshold){
                if(thisScore > TOXIC_BOUNDARY || thisCredScore > CRED_BOUNDARY){
                  divToColor.classList.add('toxicUser')
                }else if(thisScore < 0){
                    divToColor.classList.add('notEnoughTweets')
                }else if(0 < thisScore && thisScore < TOXIC_BOUNDARY && thisCredScore < CRED_BOUNDARY){
                  divToColor.classList.add('safeUser')

                }
            }else{
              if(divToColor.classList.contains('toxicUser') || divToColor.classList.contains('safeUser') || divToColor.classList.contains('notEnoughTweets')){
                divToColor.classList.remove('computing')
              }else{
                divToColor.classList.add('computing')
                // console.log('class added!')
                getTimelineScores(canId, pollInTimeline, userCandidate)
              }
            }
            
          }

        }

      }
    }
  }
}




function pollInTimeline(response, domelement){
  // console.log('called poll status in timeline')
  // console.log(domelement)
  var response_json = JSON.parse(response);
  var task_id = response_json['task_id']
  var screen_name = response_json['screen_name']
  var threshold = response_json['threshold']
 
  // var url = URL_HEADER + "/poll_status?task_id=" + task_id + '&screen_name=' + screen_name + '&threshold=' + threshold
  var url = URL_HEADER + "/poll_with_higher_threshold?task_id=" + task_id + '&screen_name=' + screen_name + '&threshold=' + threshold
  
  // var url = "http://twitter-shield.si.umich.edu/poll_status?task_id=" + task_id + '&screen_name=' + screen_name + '&threshold=' + threshold
  var request = new XMLHttpRequest();

  request.onreadystatechange = function(){
    // if (request.readyState == 4 && request.status == 200){
    if (request.readyState == 4  && request.status == 200){
      result = JSON.parse(request.responseText)
      if (result['state'] == 'PENDING'){
        status = JSON.parse(request.responseText)['result']
        setTimeout(function(){pollInTimeline(response)}, 3000);
        // console.log('poll in timeline - ' + screen_name + ' - ' + task_id)
      }else if (result['state'] == 'SUCCESS' && result['result']!='FAILURE'){
        // console.log('success')
        highlightUserTimeline(request.responseText, response_json['screen_name'])
        var result_json = JSON.parse(request.responseText)
        //toxicity
        var accountFlaggedTweets = getFlaggedTweets(result_json)
        flaggedTweets[screen_name] = accountFlaggedTweets
        localStorage.setItem('flaggedTweets', JSON.stringify(flaggedTweets))
        //credibility
        var accountCredFlaggedTweets = getCredFlaggedTweets(result_json)
        flaggedCredTweets[screen_name] = accountCredFlaggedTweets
        localStorage.setItem('flaggedCredTweets', JSON.stringify(flaggedCredTweets))
        // highlightUser(request.responseText, domelement, response_json['screen_name'])
        // console.log(request.responseText)
      }else{
        //fail
        highlightUserTimeline(request.responseText, response_json['screen_name'])
      }
    }
  };

  request.open('GET', url);
  request.send();
}

function getNotificationScores(username, callback, callback_input) {
    // first check queue
    if(username in notificationQueue){
      console.log(notificationQueue[username])
      notificationQueue[username].add(callback_input)
      console.log(notificationQueue[username])
      console.log('notification queue added!')
    }else{
      notificationQueue[username] = new Set([callback_input])
      console.log(notificationQueue[username])

      oauth_token = localStorage.getItem('oauth_token')
      oauth_token_secret = localStorage.getItem('oauth_token_secret')
      // var url = URL_HEADER + "/toxicityscore?user=" + username + '&threshold=' + threshold + '&oauth_token=' + oauth_token + '&oauth_token_secret=' + oauth_token_secret
      
      var url = URL_HEADER + "/toxicity_score_higher_threshold?user=" + username + '&threshold=' + threshold + '&oauth_token=' + oauth_token + '&oauth_token_secret=' + oauth_token_secret
      
      var request = new XMLHttpRequest();
      request.onreadystatechange = function(){
          if (request.readyState == 4 && request.status == 200){
              // console.log('returned: ' + request.responseText)
              callback(request.responseText, callback_input); // Another callback here
          }
      };
      request.open('GET', url);
      request.send();
    }
}

function pollInNotification(response, domelement){
  // console.log('called poll status in timeline')
  // console.log(domelement)
  var response_json = JSON.parse(response);
  var task_id = response_json['task_id']
  var screen_name = response_json['screen_name']
  var threshold = response_json['threshold']
 
  // var url = URL_HEADER + "/poll_status?task_id=" + task_id + '&screen_name=' + screen_name + '&threshold=' + threshold
  var url = URL_HEADER + "/poll_with_higher_threshold?task_id=" + task_id + '&screen_name=' + screen_name + '&threshold=' + threshold
  
  // var url = "http://twitter-shield.si.umich.edu/poll_status?task_id=" + task_id + '&screen_name=' + screen_name + '&threshold=' + threshold
  var request = new XMLHttpRequest();

  request.onreadystatechange = function(){
    // if (request.readyState == 4 && request.status == 200){
    if (request.readyState == 4  && request.status == 200){
      var result = JSON.parse(request.responseText)
      if (result['state'] == 'PENDING'){
        status = JSON.parse(request.responseText)['result']
        setTimeout(function(){
                    pollInNotification(response)}, 
                    3000);
        console.log('poll in timeline - ' + screen_name + ' - ' + task_id)
      }else if (result['state'] == 'SUCCESS' && result['result']!='FAILURE'){
        console.log('success')
        highlightUserNotification(request.responseText, response_json['screen_name'])
        var result_json = JSON.parse(request.responseText)
        //toxicity
        var accountFlaggedTweets = getFlaggedTweets(result_json)
        flaggedTweets[screen_name] = accountFlaggedTweets
        localStorage.setItem('flaggedTweets', JSON.stringify(flaggedTweets))
        //credibility
        var accountCredFlaggedTweets = getCredFlaggedTweets(result_json)
        flaggedCredTweets[screen_name] = accountCredFlaggedTweets
        localStorage.setItem('flaggedCredTweets', JSON.stringify(flaggedCredTweets))
        // console.log(request.responseText)s
      }else{
        //fail
        highlightUserNotification(request.responseText, response_json['screen_name'])
      }
    }
  };

  request.open('GET', url);
  request.send();
}

function highlightUserNotification(response_json, screen_name){
  var elementsToChange = notificationQueue[screen_name]
  console.log('highlight doms - ' + screen_name)
  console.log(elementsToChange.length)
  console.log(elementsToChange)
  response_json = JSON.parse(response_json);
  // for(i=0; i<elementsToChange.length; i++){
  elementsToChange.forEach(domelement => {
    console.log(domelement)
    if(domelement!=null){
      var divToColor = domelement.querySelector('.css-1dbjc4n.r-sdzlij.r-1p0dtai.r-1mlwlqe.r-1d2f490.r-1udh08x.r-u8s1d.r-zchlnj.r-ipm5af.r-417010')
      divToColor.classList.remove('computing')
      if(divToColor!=null){
        if(response_json['result'] == 'No tweets'){
          divToColor.classList.add('notEnoughTweets')
          var score = -1
          var credScore = -1
          storeLocally(screen_name, score, credScore)
        }else if(response_json['result'] != 'FAILURE' && 'toxicity' in response_json['result']){
          console.log(screen_name)
          console.log(response_json)
          var score = response_json['result']['toxicity']['TOXICITY']['score']
          var credScore = response_json['result']['uncrediblity']['uncrediblity']
          storeLocally(screen_name, score, credScore)

          if(response_json['result']['toxicity']['TOXICITY']['score'] > TOXIC_BOUNDARY){ 
            divToColor.classList.add('toxicUser')
          }else{
            divToColor.classList.add('safeUser')
          }
        }else{
          //fail
          divToColor.classList.add('errorBorder')
        }
        
      }
    }
  });
  delete notificationQueue[screen_name]
  // localStorage.setItem('notificationQueue', JSON.stringify(notificationQueue))
}


function highlightUserTimeline(response_json, screen_name){
  var elements = timelineQueue[screen_name]
  response_json = JSON.parse(response_json);
  // for(i=0; i<elementsToChange.length; i++){
  elements.forEach(domelement => {
    if(domelement!=null){  
      var divToColor = domelement.querySelector('.css-1dbjc4n.r-sdzlij.r-1p0dtai.r-1mlwlqe.r-1d2f490.r-1udh08x.r-u8s1d.r-zchlnj.r-ipm5af.r-417010')
      divToColor.classList.remove('computing')
      if(divToColor!=null){
        if(response_json['result']=='No tweets'){
          divToColor.classList.add('notEnoughTweets')
          var score = -1
          var credScore = -1
          storeLocally(screen_name, score, credScore)
        }else if(response_json['result'] != 'FAILURE' && 'toxicity' in response_json['result']){
          var score = response_json['result']['toxicity']['TOXICITY']['score']
          var credScore = response_json['result']['uncrediblity']['uncrediblity']
          storeLocally(screen_name, score, credScore)
   
          if(response_json['result']['toxicity']['TOXICITY']['score'] > TOXIC_BOUNDARY){ 
            divToColor.classList.add('toxicUser')
          }else{
            divToColor.classList.add('safeUser')
          }
        }else{
          //fail
          divToColor.classList.add('errorBorder')
        }
        
      }
    }
  });
  delete timelineQueue[screen_name]
  // localStorage.setItem('timelineQueue', JSON.stringify(timelineQueue))
}


function get_score_notif(userIDNode) {
  // var url =  "http://twitter-shield.si.umich.edu/tpi?user=" + userIDNode.innerText + "&numberTwit=200";
  var url = URL_HEADER + "/tpi?user=" + userIDNode.innerText + "&numberTwit=200";
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


function highlightAbusivePostsNewTwitter(response_json) {
  flagged_tweets = response_json['tweets_with_scores']
    
  var alltweets = document.querySelectorAll('[data-testid="tweet"]')
  console.log(alltweets)

  for(i=0;i<alltweets.length;i++){
    var tweet = alltweets[i].querySelector('.css-901oao.r-hkyrab.r-1qd0xha.r-a023e6.r-16dba41.r-ad9z0x.r-bcqeeo.r-bnwqim.r-qvutc0').innerText;
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

function ignoreURL(url){
  console.log('ignore url')
  for(i = 0; i < ignoreURLs.length; i++) {
    if(url.indexOf(ignoreURLs[i]) > 0){
      console.log(ignoreURLs[i])
      return true
    }
  }
  return false
}

function checkTabWithinProfile(thisPageID){
  if(withRepliesRegex.test(thisPageID)){
    thisPageID = thisPageID.replace("/with_replies", "")
    thisTab = 'replies'
    console.log(thisPageID + '-- replies')
  }else if(mediaRegex.test(thisPageID)){
    thisPageID = thisPageID.replace("/media", "")
    thisTab = 'media'
    console.log(thisPageID + '-- media')
  }else if(likesRegex.test(thisPageID)){
    thisPageID = thisPageID.replace("/likes", "")
    thisTab = 'likes'
    console.log(thisPageID + '-- likes')
  }else{
    thisTab = ''
  }
  return [thisPageID, thisTab]
}

function createCssClasses(){
  toxicUserBorderStyle = document.createElement('style');
  toxicUserBorderStyle.type = 'text/css';
  toxicUserBorderStyle.innerHTML = '.toxicUser { border-style: solid; border-color: #FC427B; border-width: 3.5px; }';
  document.getElementsByTagName('head')[0].appendChild(toxicUserBorderStyle)

  safeUserBorderStyle = document.createElement('style');
  safeUserBorderStyle.type = 'text/css';
  // safeUserBorderStyle.innerHTML = '.safeUser { border-style: solid; border-color: #5aca7f; border-width: 3.5px; }';
  safeUserBorderStyle.innerHTML = '.safeUser { }';
  document.getElementsByTagName('head')[0].appendChild(safeUserBorderStyle)


  errorBorderStyle = document.createElement('style');
  errorBorderStyle.type = 'text/css';
  // safeUserBorderStyle.innerHTML = '.safeUser { border-style: solid; border-color: #5aca7f; border-width: 3.5px; }';
  errorBorderStyle.innerHTML = '.errorBorder { }';
  document.getElementsByTagName('head')[0].appendChild(errorBorderStyle)

  notEnoughTweetsBorderStyle = document.createElement('style');
  notEnoughTweetsBorderStyle.type = 'text/css';
  notEnoughTweetsBorderStyle.innerHTML = '.notEnoughTweets { }';
  document.getElementsByTagName('head')[0].appendChild(notEnoughTweetsBorderStyle)

  computingBorderStyle = document.createElement('style');
  computingBorderStyle.type = 'text/css';
  computingBorderStyle.innerHTML = '.computing { border-style: double; border-color: #1d9dfa; border-width: 5px; }';
  document.getElementsByTagName('head')[0].appendChild(computingBorderStyle)

}

function setLocalStorage(){
  profileStrangerString = (profileStrangerString) ? profileStrangerString : '{}'
  profileStrangers = JSON.parse(profileStrangerString)
  console.log(profileStrangers)
  localStorage.setItem('profileStrangers', JSON.stringify(profileStrangers))

  flaggedTweetsString = (flaggedTweetsString) ? flaggedTweetsString : '{}'
  flaggedTweets = JSON.parse(flaggedTweetsString)
  console.log(flaggedTweets)
  localStorage.setItem('flaggedTweets', JSON.stringify(flaggedTweets))

  flaggedCredTweetsString = (flaggedCredTweetsString) ? flaggedCredTweetsString : '{}'
  flaggedCredTweets = JSON.parse(flaggedCredTweetsString)
  localStorage.setItem('flaggedCredTweets', JSON.stringify(flaggedCredTweets))

  followingListString = (followingListString) ? followingListString : '{}'
  followingList = JSON.parse(followingListString)
  console.log(followingList)
  console.log(followingList['im__jane'])
  localStorage.setItem('followingList', JSON.stringify(followingList))


}



function addToxicityModal(accountFlaggedTweets, screen_name, toxicityScore){
  if(document.getElementById('toxicModal') != null){
    document.getElementById('toxicModal').remove()
  }
  var modal = document.createElement('div');
  modal.id = 'toxicModal'
  modal.classList.add('modal')
  console.log(modal)

  var modalContent =  document.createElement('div');
  modalContent.id = 'toxicModalContent'
  modalContent.classList.add('modal-content')

  var closeButton = document.createElement('span');
  closeButton.classList.add('close')
  console.log(closeButton)
  modalContent.append(closeButton)
  modal.append(modalContent)

  var accountInfo = document.createElement('div');
  accountInfo.classList.add('modal-account-info');
  accountInfo.style = 'display: inline-block; width: 80%; text-align:left;;'
  var percentage = Math.round(parseFloat(toxicityScore)*100)
  console.log(percentage)
  accountInfo.innerHTML = 'About <span style="color: #4769ec"><b>'+ percentage.toString() + '%</b></span> of <b>@' + screen_name + "</b>'s" + ' recent tweets are likely to be toxic.<br>'
  accountInfo.innerHTML += 'Below we show <span style="color: #4769ec"><b>up to 5</b></span> toxic tweet(s) of <b>@' + screen_name + "</b> as examples."
  accountInfo.innerHTML += '<br><br>'
  accountInfo.innerHTML += ' <div style="font-size:15px;">This does <b>not necessarily guarantee</b> that this account is toxic.<br>We acknowledge that your definition of "toxic" might be different.<br>Here a "toxic tweet" is defined as "a rude, disrespectful, or unreasonable comment that is likely to make you leave a discussion" according to <a href="https://www.perspectiveapi.com/#/home" target="_blank">Perspective API</a>.</div>'
  modalContent.append(accountInfo)

  document.getElementsByTagName('body')[0].appendChild(modal)

  // Get the button that opens the modal
  var btn = document.getElementById("toxicSpan");

  // Get the <span> element that closes the modal
  for(i=0; i<accountFlaggedTweets.length; i++){
    var cell = document.createElement('div')
    cell.classList.add('modal-cell')
    cell.innerHTML += accountFlaggedTweets[i][0] + '<br><small>' + accountFlaggedTweets[i][1].split(' ')[0] + '</small>'
    modalContent.append(cell)
  }
  // When the user clicks the button, open the modal 
  btn.onclick = function() {
      modal.style.display = "block";
  }
  // When the user clicks on <span> (x), close the modal
  closeButton.onclick = function() {
      modal.style.display = "none";
  }
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
    console.log(event.target)
    console.log(modal)
    if(document.getElementById('toxicModal')!=null && event.target == document.getElementById('toxicModal')){
      document.getElementById('toxicModal').style.display = "none";
    }
    if(document.getElementById('credModal')!=null && event.target == document.getElementById('credModal')){
      document.getElementById('credModal').style.display = "none";
    }
  }
}


function addCredibilityModal(accountUncredibleTweets, screen_name, credScore){
  if(document.getElementById('credModal') != null){
    document.getElementById('credModal').remove()
  }
  var modal = document.createElement('div');
  modal.id = 'credModal'
  modal.classList.add('modal')
  console.log(modal)

  var modalContent =  document.createElement('div');
  modalContent.id = 'credModalContent'
  modalContent.classList.add('modal-content')

  var closeButton = document.createElement('span');
  closeButton.classList.add('close')
  console.log(closeButton)
  modalContent.append(closeButton)
  modal.append(modalContent)

  var accountInfo = document.createElement('div');
  accountInfo.classList.add('modal-account-info');
  accountInfo.style = 'display: inline-block; width: 80%; text-align:left;'

  var percentage = Math.round(parseFloat(credScore)*100)
  accountInfo.innerHTML = 'About <span style="color: #4769ec"><b>'+ percentage.toString() + '%</b></span> of  <b>@' + screen_name + "</b>'s" + ' recent tweets contain links that are likely from misinformation-related sources.<br>'
  accountInfo.innerHTML += 'Below are the most recent misinformation related tweet(s) of <b>@' + screen_name + "</b>."
  accountInfo.innerHTML += '<br><br>'
  accountInfo.innerHTML += '<div style="font-size:15px;">This does <b>not necessarily guarantee</b> that this account spreads misinformation.</div>'
  accountInfo.innerHTML += " <div style='font-size:15px;''>We determine the sources' credibility using " + '<a href="https://github.com/BigMcLargeHuge/opensources" target="_blank">OpenSources, a "curated resource for assessing online information sources"</a>.</div>'
  modalContent.append(accountInfo)

  document.getElementsByTagName('body')[0].appendChild(modal)

  // Get the button that opens the modal
  var btn = document.getElementById("credSpan");

  // Get the <span> element that closes the modals
  for(i=0; i<accountUncredibleTweets.length; i++){
    var cell = document.createElement('div')
    cell.classList.add('modal-cell')
    cell.innerHTML += accountUncredibleTweets[i][0] + '\n'
     cell.innerHTML += '<br><small>' + accountUncredibleTweets[i][2].split(' ')[0] + '</small>'
    cell.innerHTML += '<br><br> <b>Misinformation related source(s) in this tweet: <b> <br>'
    for(j=0; j<accountUncredibleTweets[i][1].length; j++){
      cell.innerHTML += '<a href="' + accountUncredibleTweets[i][1][j] + '">' + accountUncredibleTweets[i][1][j] + "</a>"
    }
   
    
    modalContent.append(cell)
  }
  // When the user clicks the button, open the modal 
  btn.onclick = function() {
      modal.style.display = "block";
  }
  // When the user clicks on <span> (x), close the modal
  closeButton.onclick = function() {
      modal.style.display = "none";
  }
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
    console.log(event.target)
    console.log(modal)
    if(document.getElementById('toxicModal')!=null && event.target == document.getElementById('toxicModal')){
      document.getElementById('toxicModal').style.display = "none";
    }
    if(document.getElementById('credModal')!=null && event.target == document.getElementById('credModal')){
      document.getElementById('credModal').style.display = "none";
    }
  }
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


//generic functionality that sends a bunch of tweets for prediction
// function sendPostsToPredict(){

//   var tweets = document.querySelectorAll(".tweet-text");
//   var tweets_text = []
//   console.log('Global tweet count' + global_tweetcount)
//   console.log('Tweet queried length' + tweets.length)

//     if(tweets.length > global_tweetcount){
//       ////console.log(tweets)

//       global_tweetcount = tweets.length;
//       for(i=0;i<tweets.length;i++){
//         // clean URL to form JSON parameters
//         temp = tweets[i].innerText.replace(/(?:https?|www):\/\/[\n\S]+/g, '')
//         temp =  temp.replace(/\W+/g," ")
//         tweets_text.push({"text":temp})
//       }

//       console.log('Preprocessed text length' +tweets_text.length)

//       var url = "http://127.0.0.1:5000/predict?tweets=" + JSON.stringify(tweets_text);

//       //is it not picking up on time? is 3000 too short?
//       var request = new XMLHttpRequest();
//       request.onreadystatechange = function() {
//         if (request.readyState == 4 && request.status == 200) {
//           response_json = JSON.parse(request.responseText);
//           //console.log('Flagged tweets length'+response_json.flagged_tweets.length)
//           flagged_tweets = response_json.flagged_tweets
//           highlightAbusivePosts(response_json.flagged_tweets);
//         }
//       };
//       request.open('GET', url);
//       request.send();
//       }
// }
 

// function visualizeStatus(status){
//   if(document.getElementById('status')==null){
//     statusDiv = document.createElement('span');
//     statusDiv.id = 'status'
//     statusDiv.setAttribute('style', 'font-size:1.2em; background-color:#0084B4; padding:3px; border-radius: 15px;')
//     document.getElementsByClassName('ProfileHeaderCard')[0].insertBefore(statusDiv, document.getElementsByClassName('ProfileHeaderCard-name')[0])
//     document.getElementById('status').style.color  = 'white';
//   }
//   console.log('visualizeStatus function')

//   if(status == 'done'){
//     statusDiv.innerHTML = '<br>';
//     // statusDiv.setAttribute('style', 'padding:0px; margin-bottom: 3px;')
//   }else if (status == 'started'){
//     statusDiv.setAttribute('style', 'font-size:1.2em; background-color:#0084B4; padding:3px; border-radius: 15px;')
//     statusDiv.innerHTML = ' Started! '
//   }else{
//     statusDiv.setAttribute('style', 'font-size:1.2em; background-color:#0084B4; padding:3px; border-radius: 15px;')
//     statusDiv.innerHTML = status + ' stored!'
//   }
// }


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