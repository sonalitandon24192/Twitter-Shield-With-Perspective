var URL_HEADER = 'https://twitter-shield.si.umich.edu'
// var URL_HEADER = 'http://127.0.0.1:8000'
console.log('get following list')
// OAuth.popup('twitter', {cache: true}).then(function(twitter) {


logIn(renderLogin)
        

function logIn(callback){
  var script = document.createElement('script');
  script.type = 'application/javascript'
  script.src = chrome.runtime.getURL('js/oauth.min.js');
  document.head.appendChild(script);
  script.onload = function () {
    setTimeout(function(){
      try{
      OAuth.popup('twitter').then(function(twitter) {
        console.log(twitter)
        var oauth_token = twitter['oauth_token']
        var oauth_token_secret = twitter['oauth_token_secret']
        localStorage.setItem('oauth_token', oauth_token)
        localStorage.setItem('oauth_token_secret', oauth_token_secret)
        console.log(localStorage)
        var accountName = getFollowingList(oauth_token, oauth_token_secret)
        // do some stuff with result
      });
    } catch (e) {
      if (e instanceof ReferenceError) {
        alert("Please refresh the page and try logging in again when the page has fully loaded.")
      }
    }
    },650);
    
  }
  callback();
}        


// try {
  

// } catch (e) {
//   if (e instanceof ReferenceError) {
    
//   }
// }

function renderLogin() {
  if(document.getElementById('submitId') != null){
    document.getElementById('submitId').remove()
  }
  
  // var learnMore = document.createElement('div')
  // learnMore.id = 'learnMore'
  // learnMore.innerHTML = '<a href="https://docs.google.com/document/d/12ddWNmd7TfmdMAoxhnJtHMUE9TKOMpQ1WpIzKtlWUAM/edit?usp=sharing">'
  //                       +'Learn how Stranger Danger works</a>'
  // learnMore.style = 'padding: 2px 10px; text-align: center; border-radius: 8px; background-color: #67c4e7; '
  //                 + 'text-decoration: none; display: font-size: 14px; '
  //                 + 'margin-left:15px; margin-right:15px; margin-top:3px; margin-bottom: 3px; cursor: pointer; color:white;'
  // document.getElementById('buttonPanel').append(learnMore)
  

  var btn = document.createElement('div')
  btn.innerHTML = 'Log out'
  btn.id = 'logoutBtn'
  btn.style = 'padding: 2px 10px; text-align: center; border-radius: 8px; background-color: #428bca; '
                  + 'text-decoration: none; display: font-size: 14px; '
                  + 'margin-left:15px; margin-right:15px; margin-top:3px; margin-bottom: 6px; cursor: pointer; color:white;'
  
  if(document.getElementById('buttonPanel') != null){
    addSliders();
    document.getElementById('buttonPanel').append(btn)

    btn.addEventListener('click', logOut); 

    document.getElementById('statePanel').innerHTML = ''

    
  }
}


function addSliders(){
  if(document.getElementById('toxicForm') == null){
    var toxicSlider = document.createElement('form')
    toxicSlider.id = "toxicForm"
    toxicSlider.innerHTML = '<form style="padding-left:30px; padding-right:30px;" class="sliderForm" >'
                          + '<p>Maximum toxic tweet frequency you would allow : <span id="toxicThresholdOutput">8%</span></p> '
                          + '<input type="range" step="1" min="1" max="100" name ="threshold" class = "slider" value ="8" id="toxicitySlider">'
                          + '</form>'

    document.getElementById('buttonPanel').append(toxicSlider)

    document.getElementById('toxicitySlider').onchange = function updateToxicInput(res) {
      console.log(res.target.value)
      document.getElementById('toxicThresholdOutput').innerHTML = res.target.value + '%'; 
      chrome.storage.local.set({'toxicThreshold': parseInt(res.target.value)*0.01}, function(){
        console.log('set toxic')
      })
    }

    chrome.storage.local.get(['toxicThreshold'], function(result) {
      if(result.toxicThreshold != null){
        document.getElementById('toxicThresholdOutput').innerText = Math.trunc(result.toxicThreshold * 100) +'%'
        document.getElementById('toxicitySlider').value = Math.trunc(result.toxicThreshold * 100)
      }else{
        document.getElementById('toxicThresholdOutput').innerText = '8%'
        document.getElementById('toxicitySlider').value = 8
      }
      
    });
  }
  
  if(document.getElementById('misinfoForm') == null){
    var misinfoSlider = document.createElement('form')
    misinfoSlider.id = "misinfoForm"
    misinfoSlider.innerHTML = '<form  style="padding-left:30px; padding-right:30px;" class="sliderForm" id="misinfoForm">'
                            + '<p>Maximum misinfo. tweet frequency you would allow: <span id="misinfoThresholdOutput">2%</span></p>'
                            + '<input type="range" step="1" min="1" max="100" name ="threshold" class = "slider" value ="2" id="misinfoSlider">'
                            + '</form>' 
    
    document.getElementById('buttonPanel').append(misinfoSlider)      
          
    
    document.getElementById('misinfoSlider').onchange = function updateMisinfoInput(res) {
      document.getElementById('misinfoThresholdOutput').innerHTML = res.target.value +'%'; 
      chrome.storage.local.set({'misinfoThreshold': parseInt(res.target.value)*0.01}, function(){
        console.log('set misinfo')
      })
    }
    chrome.storage.local.get(['misinfoThreshold'], function(result) {
      if(result.misinfoThreshold != null){
        document.getElementById('misinfoThresholdOutput').innerText = Math.trunc(result.misinfoThreshold * 100) +'%'
        document.getElementById('misinfoSlider').value = Math.trunc(result.misinfoThreshold * 100)
      }else{
        document.getElementById('misinfoThresholdOutput').innerText = '2%'
        document.getElementById('misinfoSlider').value = 2
      }
      
      console.log(result.misinfoThreshold)
    });

  }
}



function getFollowingList(oauth_token, oauth_token_secret){
  var followingListString = localStorage.followingList
  followingListString = (followingListString) ? followingListString : '{}'
  followingList = JSON.parse(followingListString)
  localStorage.setItem('followingList', JSON.stringify(followingList))

  console.log('following list')

  showModal()
  var url = URL_HEADER + "/get_following?oauth_token=" + oauth_token + '&oauth_token_secret=' + oauth_token_secret
  var request = new XMLHttpRequest();
  request.onreadystatechange = function(){
      if (request.readyState == 4 && request.status == 200){
          console.log('returned: ' + request.responseText)
          console.log(request.responseText)
          var response_json = JSON.parse(request.responseText);
          //flagged_tweets = response_json.flagged_tweets
          var accountName = response_json['account_name']
          localStorage.setItem('accountName', accountName)
          var thisFollowing = response_json['following']
          followingList[accountName] = thisFollowing
          localStorage.setItem('followingList', JSON.stringify(followingList))
          console.log(followingList)
          document.getElementById('alertModal').style.display='none'
          chrome.storage.local.set({'accountName': accountName}, function(){
            console.log('set!!!!!!!!!!!!!!!!!')
          })
          return response_json['account_name']
      }
  };
  request.open('GET', url);
  request.send();



}




function showModal(){
  console.log('show modal')
  if(document.getElementById('alertModal')==null){
    var modal = document.createElement('div');
    modal.id = 'alertModal'
    modal.classList.add('modal')
    console.log(modal)

    var modalContent =  document.createElement('div');
    modalContent.classList.add('modal-content')
    modalContent.style = "border: 1px solid #888; font-size: 20x; position: relative; background-color: white; width: 45%; height: 22%; border-radius: 5px;"

    var closeButton = document.createElement('span');
    closeButton.classList.add('close')
    console.log(closeButton)
    modalContent.append(closeButton)
    modal.append(modalContent)

    modalContent.innerHTML = 'We are storing the list of accounts that you follow on your browser. <br> Please wait about 10 seconds. <br> This popup will <b>disappear automatically</b> once finished. :)'

    document.getElementsByTagName('body')[0].appendChild(modal)
    modal.style.display='block'


    window.onclick = function(event) {
      
      if(document.getElementById('alertModal')!=null && event.target == document.getElementById('alertModal')){
        console.log(event.target)
        document.getElementById('alertModal').style.display = "none";
      }
    }
  }else{
    document.getElementById('alertModal').style.display='block'
  }


}