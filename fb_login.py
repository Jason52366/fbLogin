def fb_access(request):
    if request.method != "POST":
        return HttpResponseRedirect("/")

    fb_expire = int(request.POST.get("expiresIn", ""))
    access_token = request.POST.get("accessToken", "")
    fb_id = request.POST.get("userID", "")

    if not fb_id or not access_token or not fb_expire:
        return HttpResponseRedirect("/")
    ts = time.time() + fb_expire
    expiration_date = datetime.datetime.fromtimestamp(ts).isoformat()
    # 製作 Parse 需要的Facebook-Auth Data
    auth_data = {
        "facebook": {
            "id": fb_id,
            "access_token": access_token,
            "expiration_date": expiration_date
        }
    }
    # 用 auth_data 登入 parse（若無則註冊）會員
    u = User.login_auth(auth_data)  

    img_url = request.POST.get("imgUrl", "")
    name = request.POST.get("name", "")
    email = request.POST.get("email", "")
    # 如果有資料，第2次送來的資料
    if len(name) > 0:  
        u.imgUrl = img_url
        u.displayName = name
        u.email = email
        u.save()

    request.session['session_token'] = u.sessionToken
    request.session.set_expiry(fb_expire)     # session 同FB一起失效
    return HttpResponse(u.objectId)


def logout(request):
    url = request.GET.get("url")              # 獲得redirect url
    try:
        del request.session["session_token"]  # 刪除session確保登出
    except Exception as e:
        print "Logout Failed, ERROR:" + e.message.decode()
    return HttpResponseRedirect(url)