from re import T
from flask import render_template, request, Flask, session, send_from_directory
import json
import uuid
import os
import datetime
import time
from itertools import chain
from pypinyin import pinyin, Style


app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)
app.config['PERMANENT_SESSION_LIFETIME'] = datetime.timedelta(days=7)
ver="4.4"

rooms={}

#utils

def to_pinyin(s):
    return ''.join(chain.from_iterable(pinyin(s["display"], style=Style.TONE3)))
    
def getUUID():
    return str(uuid.uuid4())

def createPlayer(name):
    userId=session.get('userId')
    
    if userId:
        return {"id": userId, "name": name, "scoreTotal": 0, "scoreAvg": 0, "accAvg": 0, "playRecord": [], "exited": False}
    else:
        userId=getUUID()
        session['userId']=userId
        return {"id": userId, "name": name, "scoreTotal": 0, "scoreAvg": 0, "accAvg": 0, "playRecord": [], "exited": False}

def getNow():
    return int(datetime.datetime.now().timestamp()*1000)

def getRoomInfoRaw(roomId):
    tempinfo={}
    tempinfo['id']=rooms[roomId]['id'] 
    tempinfo['stage']=rooms[roomId]['stage'] 
    tempinfo['playerNumber'] =rooms[roomId]['playerNumber'] 
    tempinfo['players']=rooms[roomId]['players']
    tempinfo['owner']=rooms[roomId]['owner']
    tempinfo['playRound']=rooms[roomId]['playRound']
    tempinfo['playRounds']=rooms[roomId]['playRounds']
    return tempinfo
    

#request
@app.route('/api/multi/requestRoom/<roomId>')
def requstRoom(roomId):
    if roomId in rooms:
        if rooms[roomId]['closed']==True:
            return json.dumps({"code":-2,"msg":"房间不存在，您可以创建房间！"})
        if not rooms[roomId]['stage'] == 0:
            return json.dumps({"code":-1,"msg":"该房间比赛已开始！"})
        else:
            return json.dumps({"code":0,"msg":"该房间可以加入！"})
    else:
        return json.dumps({"code":-2,"msg":"房间不存在，您可以创建房间！"})

@app.route('/api/multi/createRoom/<roomId>', methods=["POST"])
def createRoom(roomId):
    req=json.loads(request.data)
    if not roomId in rooms or rooms[roomId]['closed']:
        if roomId in rooms:
            rooms[roomId]={}
        thisplayer=createPlayer(req['name'])
        rooms[roomId]={}
        rooms[roomId]['id'] = roomId
        rooms[roomId]['stage'] = 0
        rooms[roomId]['playerNumber'] = 1
        rooms[roomId]['players']={}
        rooms[roomId]['players'][thisplayer['id']]=thisplayer
        rooms[roomId]['owner']=thisplayer["id"]
        rooms[roomId]['evt']=[]
        rooms[roomId]['evt'].append({"type":"create","msg":"{} 创建了 {} 房间".format(thisplayer['name'],roomId),"time":getNow()})
        rooms[roomId]['playRound']=-1
        rooms[roomId]['playRounds']=[]
        rooms[roomId]['closed']=False
        return json.dumps({'code':0,"selfUser":thisplayer,"selfRoom":rooms[roomId]})
    else:
        return json.dumps({"code":-1,"msg":"该房间ID已被占用"})

@app.route("/api/multi/joinRoom/<roomId>", methods=["POST"])
def joinRoom(roomId):
    req=json.loads(request.data)
    if roomId in rooms:
        thisplayer=createPlayer(req['name'])
        rooms[roomId]['playerNumber']=rooms[roomId]['playerNumber']+1
        rooms[roomId]['players'][thisplayer['id']]=thisplayer
        rooms[roomId]['evt'].append({"type":"join","msg":"{} 加入了房间".format(thisplayer['name']),"time":getNow()})
        return json.dumps({'code':0,"selfUser":thisplayer,"selfRoom":rooms[roomId]})
    else:
        return json.dumps({"code":-1,"msg":"该房间不存在"})

@app.route("/api/multi/getRoomInfo/<roomId>")
def getRoomInfo(roomId):
    return json.dumps(getRoomInfoRaw(roomId))

@app.route("/api/multi/lockRoom/<roomId>")
def lockRoom(roomId):
    userId=session.get('userId')
    if not userId or userId!=rooms[roomId]['owner']:
        return "Access denied"
    rooms[roomId]['stage']=1
    rooms[roomId]['evt'].append({"type":"lock","msg":"房间人员锁定，游戏即将开始","time":getNow()})
    return json.dumps(getRoomInfoRaw(roomId))

@app.route("/api/multi/kickPlayer/<roomId>/<playerId>")
def kickPlayer(roomId, playerId):
    userId=session.get('userId')
    if not userId:
        return "Access denied"
    if userId != playerId and userId != rooms[roomId]['owner']:
        return "Access denied"
    player=rooms[roomId]['players'][playerId]
    if playerId == rooms[roomId]['owner']:
        rooms[roomId]['evt'].append({"type":"close","msg":"房间关闭！","time":getNow()})
        rooms[roomId]['closed']=True
        return json.dumps(getRoomInfoRaw(roomId))
    else:
        if rooms[roomId]['stage']==0:
            rooms[roomId]['evt'].append({"type":"exit","msg":"{} 退出房间！".format(rooms[roomId]['players'][playerId]['name']),"extraInfo":{"id":playerId},"time":getNow()})
            del rooms[roomId]['players'][playerId]
            return json.dumps(getRoomInfoRaw(roomId))
        else:
            rooms[roomId]['evt'].append({"type":"exit","msg":"{} 退出房间！".format(rooms[roomId]['players'][playerId]['name']),"extraInfo":{"id":playerId},"time":getNow()})
            player['exited']=True
    rooms[roomId]['playerNumber']=rooms[roomId]['playerNumber']-1
    if rooms[roomId]['stage']==3 and len(rooms[roomId]['playRounds'][rooms[roomId]['playRound']]['scores']) == rooms[roomId]['playerNumber']:
        rooms[roomId]['stage']=4
        rooms[roomId]['evt'].append({"type":"allScoreUploaded","msg":"所有人已经完成分数上传！","time":getNow()})
    if rooms[roomId]['stage']==1 or rooms[roomId]['stage']==5 and len(rooms[roomId]['playRounds'][rooms[roomId]['playRound']]['loaded']) == rooms[roomId]['playerNumber']:
        rooms[roomId]['stage']=2
        rooms[roomId]['evt'].append({"type":"allLoadFinish","msg":"所有人已经完成谱面加载，游戏可以开始！","time":getNow()})
    return json.dumps(getRoomInfoRaw(roomId))

@app.route("/api/multi/syncChartInfo/<roomId>/<t>", methods=["POST"])
def syncChartInfo(roomId, t):
    userId=session.get('userId')
    if not userId or userId!=rooms[roomId]['owner']:
        return "Access denied"
    req=json.loads(request.data)
    rooms[roomId]['evt'].append({"type":"loadChart","msg":"谱面 {} 已被选定！".format(req['downlink'].replace("/static/charts/","").replace(".zip","")),"extraInfo":req,"time":getNow()})
    rooms[roomId]['playRounds'].append({"scores":{},"loaded":[session["userId"]],"chartInfo":req})
    rooms[roomId]['playRound']=rooms[roomId]['playRound']+1
    rooms[roomId]['stage']=5
    if rooms[roomId]['playerNumber']==1:
        rooms[roomId]['stage']=2
        rooms[roomId]['evt'].append({"type":"allLoadFinish","msg":"所有人已经完成谱面加载，游戏可以开始！","time":getNow()})
    return json.dumps(getRoomInfoRaw(roomId))

@app.route("/api/multi/loadChartFinish/<roomId>/<t>")
def loadChartFinish(roomId, t):
    userId=session.get('userId')
    if not userId:
        return "Access denied"
    if not userId in rooms[roomId]['playRounds'][rooms[roomId]['playRound']]['loaded']:
        rooms[roomId]['playRounds'][rooms[roomId]['playRound']]['loaded'].append(userId)
        rooms[roomId]['evt'].append({"type":"chartLoadFinish","msg":"用户 {} 已完成谱面加载，加载人数 {}/{}！".format(rooms[roomId]['players'][userId]['name'],len(rooms[roomId]['playRounds'][rooms[roomId]['playRound']]['loaded']),rooms[roomId]['playerNumber']),"time":getNow()})
        if len(rooms[roomId]['playRounds'][rooms[roomId]['playRound']]['loaded']) == rooms[roomId]['playerNumber']:
            rooms[roomId]['stage']=2
            rooms[roomId]['evt'].append({"type":"allLoadFinish","msg":"所有人已经完成谱面加载，游戏可以开始！","time":getNow()})
    return json.dumps(getRoomInfoRaw(roomId))

@app.route("/api/multi/startGamePlay/<roomId>")
def startGamePlay(roomId):
    userId=session.get('userId')
    if not userId or userId!=rooms[roomId]['owner']:
        return "Access denied"
    rooms[roomId]['stage']=3
    rooms[roomId]['evt'].append({"type":"gameStart","msg":"游戏开始。","time":getNow()})
    return json.dumps(getRoomInfoRaw(roomId))

@app.route("/api/multi/nextTrack/<roomId>")
def nextTrack(roomId):
    userId=session.get('userId')
    if not userId or userId!=rooms[roomId]['owner']:
        return "Access denied"
    rooms[roomId]['stage']=1
    rooms[roomId]['evt'].append({"type":"nextTrack","msg":"下一轮游戏开始","time":getNow()})
    return json.dumps(getRoomInfoRaw(roomId))

@app.route("/api/multi/getRoomEvt/<roomId>/<lastEvt>")
def getRoomEvt(roomId, lastEvt):
    lastEvt=int(lastEvt)
    evtsToSend=rooms[roomId]['evt'][lastEvt:]
    return json.dumps(evtsToSend)

@app.route("/api/multi/uploadScoreInfo/<roomId>", methods=["POST"])
def uploadScoreInfo(roomId):
    userId=session.get('userId')
    if not userId:
        return "Access denied"
    req=json.loads(request.data)
    player=rooms[roomId]['players'][userId]
    thisround=rooms[roomId]['playRounds'][rooms[roomId]['playRound']]
    scores=thisround['scores']

    # 更新房间数据
    req.update({"name":player['name'],'chartInfo':thisround['chartInfo']})
    scores[userId]=req

    #更新玩家数据
    player['playRecord'].append(req)
    scoresTotal=0
    keysAcc=0
    keysTotal=0
    round=0
    for item in player['playRecord']:
        round+=1
        keysAcc+=(item['all']*item['accNum'])
        keysTotal+=item['all']
        scoresTotal+=item['scoreNum']
    player['scoreTotal']=scoresTotal
    player['scoreAvg']=scoresTotal/round
    player['accAvg']=keysAcc/keysTotal
    
    rooms[roomId]['evt'].append({"type":"sbScoreUploaded","msg":"用户 {} 打完啦！详情统计请查看多人游戏面板！".format(rooms[roomId]['players'][userId]['name']),"time":getNow()})
    
    if len(scores) == rooms[roomId]['playerNumber']:
        rooms[roomId]['stage']=4
        rooms[roomId]['evt'].append({"type":"allScoreUploaded","msg":"所有人已经完成分数上传！","time":getNow()})
    return json.dumps(getRoomInfoRaw(roomId))

@app.route('/api/multi/getLatestVersion')
def getLatestVersion():
    global ver
    chartNumber=0
    for root, dirs, files in os.walk("static/charts/"):
        for name in files:
            chartNumber+=1
    return json.dumps({"ver":ver+".{}".format(chartNumber)})

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'favicon.ico', mimetype='image/vnd.microsoft.icon')


@app.route('/sw.v2.js')
def swv2():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'sw.v2.js', mimetype='text/javascript')

@app.route('/static/<name>.js')
def scriptsjs(name):
    return send_from_directory(os.path.join(app.root_path, 'static'), '{}.js'.format(name), mimetype='text/javascript')

@app.route('/static/js/<name>')
def comjs(name):
    return send_from_directory(os.path.join(app.root_path, 'static/js'), name, mimetype='text/javascript')

@app.route('/calibrate/')
def calibrate():
    return render_template('calibrate.html')

@app.route('/')
def mainx():
    global ver
    chartList=[]
    chartNumber=0
    for root, dirs, files in os.walk("static/charts/"):
        for name in files:
            chartNumber+=1
            chartList.append({"src":"/static/charts/"+name,"display":name.replace(".zip","")})
    chartList=sorted(chartList,key=to_pinyin)
    return render_template('mainplay.html',chartList=chartList, chartLastUpdate=str(datetime.datetime.now()), ver=ver+".{}".format(chartNumber))

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8081, debug=False)
