var is_login = false;
var get_info = false;
var get_img = false;
var send_data = {};
var is_init = false;

// loading page 功能請插入下列html
//<div id="loading_div" hidden="">
    //<img src="{% static 'img/loading.gif' %}">
    //<div></div>
//</div>

//call initFB() in $(document).ready();

//getFacebookSDK 
(function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {
        return;
    }
    js = d.createElement(s);
    js.id = id;
    js.src = "//connect.facebook.net/zh_TW/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));
function initFB()
{
    alert("記得appId, app-version");
	window.fbAsyncInit = function() 
	{
		FB.init(
		{
			appId      : '',
            cookie     : true,  // enable cookies to allow the server to access

			xfbml      : true,  // parse social plugins on this page
			version    : 'v2.5' // use version 2.5
		});
		checkLoginState();
	}
}
//登入功能，登入按鈕Click後可直接用此Function，並且刷新狀態到$("#status")
//isLogin如果是true的話，會順便更新使用者照片、名稱等資訊 (send to server by ajax)
function fbLogin(isLogin)
{
    is_login = isLogin;
    pageLoading(true);
    pageLoadingMSG("等待登入臉書");

    FB.login(function(response) 
    {
        statusChangeCallback(response);
        //scope 可以要各種權限 
        //https://developers.facebook.com/docs/facebook-login/permissions/v2.4#reference
    }, {scope: 'public_profile,email,user_photos',auth_type: 'rerequest'});
}

//登出直接Call這個function，並且刷新狀態到$("#status")
function fbLogout(redirect_url)
{
    pageLoading(true);
    pageLoadingMSG("登出中，請稍等");
    FB.logout(function(response) 
    {
        if(redirect_url)
        {
            // 記得去後端設定這條url的登出功能
            //url(r'^logout/$', views.logout, name='logout'),
            window.location = "/logout/?url=" + redirect_url; 
        }
        else
        {
            window.location = "/";
        }
    });
}
//獲得帶有登入狀態的response
function checkLoginState()
{
    is_init = true;
    FB.getLoginStatus(function(response) 
    {
        statusChangeCallback(response);
        is_init = false;
    });
    pageLoading(false);
}
//依據response檢查目前登入狀態
function statusChangeCallback(response) 
{
    if (response.status === 'connected') 
    {
        $("#status").html("Success");
        pageLoadingMSG("成功登入，正在更新使用者資訊");
        //成功登入並授權這個app
        for(var key in response.authResponse)
        {
            // key = "expiresIn", "accessToken", "userID" 請記得於後端接下住他們
            send_data[key] = response.authResponse[key]; 
        }
        sendFBAccess();
    } 
    else if (response.status === 'not_authorized') 
    {
        //未同意使用這個APP
        $("#status").html("未授權此App");
        pageLoading(false);
    } 
    else 
    {
        //未登入臉書
        $("#status").html("未登入");
        pageLoading(false);
    }
}

function sendFBAccess()
{
    var csrftoken = $.cookie('csrftoken');//理論上django架的都會有啦，.cookie有jQuery就可以用

    function csrfSafeMethod(method) 
    {
        // these HTTP methods do not require CSRF protection
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    $.ajaxSetup(
    {
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            }
        }
    });

    $.ajax(
    {
        url: '/fb-access', // url(r'^fb-access$', views.fb_access),
        type: 'post',      
        data: send_data,
        success: function(response) 
        {
            if(is_login)
            {
                //如果是按下登入按鈕，會進來這邊，會更新使用者的fb大頭貼、fb匿稱等資訊
                is_login = false;
                //載好新的使用者資料後，會再次call sendFBAccess，並且進入下面的判斷，然後重整頁面
                getUserData();
            }
            else if(get_img & get_info)
            {
                pageLoadingMSG("資訊更新完成，正在重整頁面");
                window.location = "";
            }
            else
            {
                pageLoading(false);
            }
        },
        failure: function(response) 
        {
            pageLoading(false);
        },
        complete: function()
        {
            
        }
    });
}

function getUserData()
{
    //更多關於 FB.api()
    //https://developers.facebook.com/docs/javascript/reference/FB.api/

    FB.api('/me/picture?width=480&height=480', 
           'get', //get post put delete
           function(response) 
           {
                var img_url = response["data"]["url"];
                send_data["imgUrl"] = img_url;
                get_img = true;
                pageLoadingMSG("更新使用者匿稱、照片");
                if(get_info)
                {
                    sendFBAccess();
                }
           }
    );

    FB.api('/me', 
           'get', //get post put delete
           {fields: 'name,email'},
           function(response) 
           {
                send_data["name"] = response["name"];
                send_data["email"] = response["email"];
                get_info = true;
                pageLoadingMSG("更新使用者匿稱、照片");
                if(get_img)
                {
                    sendFBAccess();
                }
           }
    );
}

function initPageLoading()
{
    var div = $("#loading_div");
    div.css("height", "100%");
    div.css("width", "100%");
    div.css("background", "rgb(255, 255, 255)");
    div.css("opacity", "0.6");
    div.css("text-align", "center");
    div.css("z-index", "1000");
    div.css("position", "fixed");
    div.css("top", "0");
    div.css("left", "0");
    var img = div.find("img");
    img.css("margin-top", "300px");
    var msg_div = div.find("div");
    msg_div.css("font-size", "30px");
    msg_div.css("color", "#555");
    msg_div.text("");
}

function pageLoading(isLoading)
{

    $("#loading_div div").text("");
    if(isLoading)
    {
        $("#loading_div").show();
    }
    else
    {
        if(is_init) //避免勿關登入時的loading訊息
        {
            return;
        }
        $("#loading_div").hide();
    }
}

function pageLoadingMSG(msg)
{
    $("#loading_div div").text(msg);
}
