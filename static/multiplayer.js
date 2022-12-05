import { full } from './js/common.js';
import { uploader } from './js/reader.js';
const $ = query => document.getElementById(query);
export const multi = {
    multiSelf: null,
    edata: {
        nowChartOptions: {},
        stat: null,
        charts: {}  
    },
    init() {
        this.multiSelf=new Vue({
            el: "#app",
            data: {
                isMulti: false,
                evts: [],
                owner: false,
                user: null,
                room: {stage:0},
                panelOpen: false,
                panelChoice: 0,
                alertMsg: [],
                gaming: false,
                exited: false,
                roundRanked: [],
                roundChartName: [],
                startNow: false,
                chartLoaded: false,
                timeStr:"",
                cacheList:[]
            },
            methods: {
                recoverMulti(lastMultiInfo) {
                    fetch(
                        `/api/multi/getRoomEvt/${lastMultiInfo.room.id}/0`
                    )
                        .then((response) => response.json())
                        .then(async (result) => {
                            multi.multiSelf.isMulti = true;
                            multi.multiSelf.room = lastMultiInfo.room;
                            multi.multiSelf.user = lastMultiInfo.user;
                            multi.multiSelf.owner = (multi.multiSelf.room.owner == multi.multiSelf.user.id);
                            if (multi.multiSelf.owner) {
                                document.getElementById("playpause").style.display = "none";
                                document.getElementById("selectfzhide").style.display =
                                    "none";
                                document.getElementById("select4").style.display = "none";
                            } else {
                                document.getElementById("select2").style.display = "none";
                                document.getElementById("playpause").style.display = "none";
                                document.getElementById("select3").style.display = "none";
                            }
                            await multi.multiSelf.renewRoomInfo()
                            for (let i = 0; i < result.length; i++) {
                                const thisevt = result[i];
                                thisevt.msg = `[${new Date(thisevt.time).format(
                                    "Y-m-d H:i:s"
                                )}] ${thisevt.msg}`;
                                this.evts.unshift(thisevt)
                            }
                            switch(multi.multiSelf.room.stage) {
                                case 0:
                                    // 房间未锁定，忽略
                                    break
                                case 1:
                                    // 房主选谱，忽略
                                    break
                                case 2:
                                    // 所有人载完谱，房主可能开始，现在立刻载谱
                                    for(let i=0;i<multi.multiSelf.evts.length;i++) {
                                        const thisevt=multi.multiSelf.evts[i]
                                        if(thisevt.type=="loadChart") {
                                            multi.edata.nowchartOptions = thisevt.extraInfo;
                                            multi.multiSelf.loadChartFirst(multi.edata.nowchartOptions.downlink);
                                            break
                                        }
                                    }
                                    break
                                case 3:
                                    // 游戏开始 自己可能打了可能没打，检测一下
                                    if(multi.multiSelf.room.playRounds[multi.multiSelf.room.playRound].scores&&multi.multiSelf.room.playRounds[multi.multiSelf.room.playRound].scores[multi.multiSelf.user.id]) {
                                        break
                                    } else {
                                        for(let i=0;i<multi.multiSelf.evts.length;i++) {
                                            const thisevt=multi.multiSelf.evts[i]
                                            if(thisevt.type=="loadChart") {
                                                multi.edata.nowchartOptions = thisevt.extraInfo;
                                                multi.multiSelf.loadChartFirst(multi.edata.nowchartOptions.downlink);
                                                multi.multiSelf.startNow=true;
                                                break
                                            }
                                        }
                                    }
                                    break
                                case 4:
                                    //所有人打完（包括退出者），显示成绩即可
                                    multi.multiSelf.showSmallStat()
                                    break
                                case 5:
                                    //有人完成加载但不是所有人，游戏未开始，载谱
                                    for(let i=0;i<multi.multiSelf.evts.length;i++) {
                                        const thisevt=multi.multiSelf.evts[i]
                                        if(thisevt.type=="loadChart") {
                                            multi.edata.nowchartOptions = thisevt.extraInfo;
                                            multi.multiSelf.loadChartFirst(multi.edata.nowchartOptions.downlink);
                                            break
                                        }
                                    }
                                    break
                            }
                            multi.multiSelf.renewEvents()
                        })
                },
                startMultiUI() {
                    let name = "";
                    if (localStorage.multiname) {
                        if (
                            confirm(`要使用 ${localStorage.multiname} 的身份进行多人游戏吗？`)
                        ) {
                            name = localStorage.multiname;
                        } else {
                            name = prompt("请输入您的用户名");
                            localStorage.multiname = name;
                        }
                    } else {
                        name = prompt("请输入您的用户名");
                        localStorage.multiname = name;
                    }
                    let roomid = prompt("请粘贴房间分享信息，或输入您想创建或加入的房间ID");
                    if (!name || !roomid) {
                        alert("你还没有输入用户名或房间ID！");
                        return;
                    }
                    if (roomid.startsWith("【Phi Together")) {
                        roomid = roomid.match(/\$\$\$([^\$]+)\$\$\$/)[1];
                    } else if (roomid.indexOf("$") > -1) {
                        alert("房间ID中不得含有 $");
                    }
                    this.startMultiApi(name, roomid);
                },
                startMultiApi(name, roomid) {
                    fetch(`/api/multi/requestRoom/${roomid}`)
                        .then((response) => response.json())
                        .then((result) => {
                            if (result.code === -1) alert(result.msg);
                            else if (result.code === -2) {
                                // 创建房间
                                if (!confirm("该房间不存在，您想要创建房间吗？")) return;
                                let myHeaders = new Headers();
                                myHeaders.append("Content-Type", "application/json");
                                let request = new Request(`/api/multi/createRoom/${roomid}`, {
                                    method: "POST",
                                    mode: "no-cors",
                                    body: JSON.stringify({ name: name }),
                                    headers: myHeaders,
                                });
                                fetch(request)
                                    .then((response) => response.json())
                                    .then((result) => {
                                        multi.multiSelf.isMulti = true;
                                        multi.multiSelf.owner = true;
                                        multi.multiSelf.room = result.selfRoom;
                                        multi.multiSelf.user = result.selfUser;
                                        localStorage.lastMultiInfo = JSON.stringify({
                                            room: multi.multiSelf.room,
                                            user: multi.multiSelf.user,
                                            lastTrackLoid: 0,
                                        });
                                        document.getElementById("playpause").style.display = "none";
                                        document.getElementById("selectfzhide").style.display = "none";
                                        document.getElementById("select4").style.display = "none";
                                        msgHandler.sendMessage(
                                            "您可以在多人玩家面板中查看玩家信息，确认后可以锁定该房间并开始游戏！"
                                        );
                                        const shareInfo = `【Phi Together】我创建了一个 Phigros 联机房间，复制本条消息打开 ${window.location.href} ，点击多人游戏按钮并粘贴本条消息来和我一起联机！$$$${multi.multiSelf.room.id}$$$`;
                                        multi.multiSelf.myAlert(["分享信息如下，点击确定来复制到剪贴板！",shareInfo], ()=>{
                                            navigator.clipboard
                                                .writeText(shareInfo)
                                                .catch((errormsg) => {
                                                    alert("房间分享信息复制失败，请手动复制！"),
                                                    alert(shareInfo);
                                                });
                                            multi.multiSelf.panelChoice=0;
                                            multi.multiSelf.panelOpen=false;
                                        })
                                        this.renewEvents();
                                    });
                            } else {
                                // 加入房间
                                let myHeaders = new Headers();
                                myHeaders.append("Content-Type", "application/json");
                                let request = new Request(`/api/multi/joinRoom/${roomid}`, {
                                    method: "POST",
                                    mode: "no-cors",
                                    body: JSON.stringify({ name: name }),
                                    headers: myHeaders,
                                });
                                fetch(request)
                                    .then((response) => response.json())
                                    .then((result) => {
                                        multi.multiSelf.isMulti = true;
                                        multi.multiSelf.room = result.selfRoom;
                                        multi.multiSelf.user = result.selfUser;
                                        localStorage.lastMultiInfo = JSON.stringify({
                                            room: multi.multiSelf.room,
                                            user: multi.multiSelf.user,
                                            lastTrackLoid: 0,
                                        });
                                        document.getElementById("select2").style.display = "none";
                                        document.getElementById("playpause").style.display = "none";
                                        document.getElementById("select3").style.display = "none";
                                        msgHandler.sendMessage(
                                            `等待房主${multi.multiSelf.room.players[multi.multiSelf.room.owner]["name"]
                                            }开始游戏...（您可以在多人游戏面板中查看玩家信息）`
                                        );
                                        this.renewEvents();
                                    });
                            }
                        });
                },
                kickPlayer(id) {
                    fetch(`/api/multi/kickPlayer/${this.room.id}/${id}`)
                        .then((response) => response.json())
                        .then((result) => {
                            multi.multiSelf.room = result;
                        });
                },
                exitRoom() {
                    if(this.gaming) {
                        btnPlay.value == "停止" && btnPlay.click()
                        this.gaming=false
                        this.renewEvents()
                    }
                    fetch(`/api/multi/kickPlayer/${this.room.id}/${this.user.id}`)
                        .then((response) => response.json())
                        .then((result) => {
                            multi.multiSelf.room = result
                        });
                },
                lockRoom() {
                    fetch(`/api/multi/lockRoom/${this.room.id}`)
                        .then((response) => response.json())
                        .then((result) => {
                            alert("房间已经锁定，请选择谱面并点击同步！");
                            multi.multiSelf.room = result;
                        });
                },
                renewRoomInfo() {
                    return new Promise((res, rej) => {
                        fetch(`/api/multi/getRoomInfo/${this.room.id}`)
                            .then((response) => response.json())
                            .then((result) => {
                                multi.multiSelf.room = result;
                                multi.multiSelf.user = result["players"][multi.multiSelf.user.id];
                                //局排
                                let l = result["playRounds"];
                                multi.multiSelf.roundRanked = [];
                                multi.multiSelf.roundChartName = [];
                                for (let i = 0; i < l.length; i++) {
                                    let qt = l[i];
                                    let tmp = [];
                                    for (const t in qt.scores) {
                                        tmp.push(qt.scores[t]);
                                    }
                                    tmp = multi.multiSelf.sortByKey(tmp, "scoreNum", false);
                                    multi.multiSelf.roundRanked.unshift(tmp);
                                    multi.multiSelf.roundChartName.unshift(
                                        qt.chartInfo.downlink
                                            .replace("/static/charts/", "")
                                            .replace(".zip", "")
                                    );
                                }
                                //用户排
                                multi.multiSelf.rankedUser = [];
                                for (const i in multi.multiSelf.room.players) {
                                    multi.multiSelf.rankedUser.push(multi.multiSelf.room.players[i]);
                                }
                                multi.multiSelf.rankedUser = multi.multiSelf.sortByKey(
                                    multi.multiSelf.rankedUser,
                                    "scoreAvg",
                                    false
                                );
                                res(true);
                            });
                    });
                },
                renewEvents() {
                    if (this.gaming || this.exited) return;
                    fetch(
                        `/api/multi/getRoomEvt/${this.room.id}/${this.evts.length}`
                    )
                        .then((response) => response.json())
                        .then(async (result) => {
                            for (let i = 0; i < result.length; i++) {
                                const thisevt = result[i];
                                thisevt.msg = `[${new Date(thisevt.time).format("Y-m-d H:i:s")}] ${thisevt.msg
                                    }`;
                                switch (thisevt.type) {
                                    case "join":
                                        await multi.multiSelf.renewRoomInfo();
                                        break;
                                    case "close":
                                        alert("房间已关闭！");
                                        localStorage.removeItem("lastMultiInfo");
                                        if (this.room.stage == 0) {
                                            location.href = "about:blank";
                                        } else
                                            await this.renewRoomInfo(),
                                                (this.exited = true),
                                                btnPlay.value == "停止" && btnPlay.click(),
                                                this.showBigStat();
                                        break;
                                    case "exit":
                                        if (thisevt.extraInfo.id == this.user.id) {
                                            localStorage.removeItem("lastMultiInfo");
                                            alert("您退出游戏！");
                                            if (this.room.stage == 0) location.href = "about:blank";
                                            else
                                                await this.renewRoomInfo(),
                                                    (this.exited = true),
                                                    btnPlay.value == "停止" && btnPlay.click(),
                                                    this.showBigStat();
                                            break;
                                        } else await multi.multiSelf.renewRoomInfo();
                                        break;
                                    case "lock":
                                        multi.multiSelf.infotmp = JSON.parse(localStorage.lastMultiInfo);
                                        multi.multiSelf.infotmp.lastTrackLoid = this.evts.length + i;
                                        localStorage.lastMultiInfo = JSON.stringify(multi.multiSelf.infotmp);
                                        multi.multiSelf.room.stage = 1;
                                        if (multi.multiSelf.owner) {
                                            msgHandler.sendMessage("请选择谱面载入后点击同步！");
                                        } else {
                                            msgHandler.sendMessage("房主正在选择谱面中！请耐心等待哦！");
                                        }
                                        break;
                                    case "loadChart":
                                        multi.edata.nowchartOptions = thisevt.extraInfo;
                                        if (!multi.multiSelf.owner)
                                            multi.multiSelf.loadChartFirst(multi.edata.nowchartOptions.downlink);
                                        break;
                                    case "gameStart":
                                        msgHandler.sendMessage("比赛开始！");
                                        multi.multiSelf.myAlert(
                                            [
                                                "游戏已经开始，请在准备好后在横屏状态下点击确认按钮立即开始！",
                                            ],
                                            () => {
                                                if(multi.multiSelf.chartLoaded==false) {
                                                    return
                                                }
                                                multi.multiSelf.gaming = true;
                                                btnPlay.value == "播放" && btnPlay.click();
                                                !full.check() && full.toggle().catch(() => {
                                                    app.isFull = !app.isFull;
                                                    resizeStage();
                                                });
                                                multi.multiSelf.panelOpen = false;
                                                multi.multiSelf.panelChoice = 0;
                                            }
                                        );
                                        break;
                                    case "allLoadFinish":
                                        multi.multiSelf.room.stage = 2;
                                        multi.multiSelf.owner && alert("可以点击开始比赛！");
                                        msgHandler.sendMessage("等待比赛开始...");
                                        break;
                                    case "allScoreUploaded":
                                        multi.multiSelf.infotmp = JSON.parse(localStorage.lastMultiInfo);
                                        multi.multiSelf.infotmp.lastTrackLoid = this.evts.length + i;
                                        localStorage.lastMultiInfo = JSON.stringify(multi.multiSelf.infotmp);
                                        full.check() &&
                                            full.toggle().catch(() => {
                                                app.isFull = !app.isFull;
                                                resizeStage();
                                            });
                                        multi.multiSelf.showSmallStat();
                                        break;
                                    case "nextTrack":
                                        multi.multiSelf.infotmp = JSON.parse(localStorage.lastMultiInfo);
                                        multi.multiSelf.infotmp.lastTrackLoid = this.evts.length + i;
                                        localStorage.lastMultiInfo = JSON.stringify(multi.multiSelf.infotmp);
                                        btnPlay.value == "停止" && btnPlay.click();
                                        multi.multiSelf.room.stage = 1;
                                        multi.multiSelf.panelOpen = false;
                                        if (multi.multiSelf.owner) {
                                            msgHandler.sendMessage(
                                                "下一轮游戏已开始，请选择谱面载入后点击同步！"
                                            );
                                        } else {
                                            msgHandler.sendMessage(
                                                "下一轮游戏已开始，房主正在选择谱面中！请耐心等待哦！"
                                            );
                                        }
                                    default:
                                        break;
                                }
                                this.evts.unshift(thisevt);
                            }
                            setTimeout(this.renewEvents, 1000);
                        });
                },
                myAlert(msg, callback) {
                    this.alertMsg = msg;
                    if (callback) this.alertFunc = callback;
                    else
                        this.alertFunc = () => {
                            multi.multiSelf.panelChoice = 0;
                            multi.multiSelf.panelOpen = false;
                        };
                    window.scrollTo(0,0)
                    this.panelChoice = 1;
                    this.panelOpen = true;
                },
                sortByKey(array, key, order) {
                    return array.sort(function (a, b) {
                        var x = a[key];
                        var y = b[key];
                        if (order) {
                            return x < y ? -1 : x > y ? 1 : 0;
                        } else {
                            return x < y ? (x > y ? 1 : 0) : -1;
                        }
                    });
                },
                async showSmallStat() {
                    this.timeStr=`于${new Date().format(
                                    "Y-m-d H:i:s"
                                )}`
                    await this.renewRoomInfo();
                    window.scrollTo(0,0)
                    this.panelChoice = 2;
                    this.panelOpen = true;
                },
                async showBigStat() {
                    this.timeStr=`于${new Date().format(
                                    "Y-m-d H:i:s"
                                )}`
                    await this.renewRoomInfo();
                    window.scrollTo(0,0)
                    this.panelChoice = 3;
                    this.panelOpen = true;
                },
                loadChartFirst(downlink) {
                    while (selectbg.options.length) selectbg.options.remove(0);
                    while (selectchart.options.length) selectchart.options.remove(0);
                    while (selectbgm.options.length) selectbgm.options.remove(0);
                    multi.multiSelf.chartLoaded=false;
                    const xhr = new XMLHttpRequest();
                    xhr.open("get", `${downlink}`, true);
                    xhr.responseType = "arraybuffer";
                    xhr.send();
                    xhr.onprogress = (progress) => {
                        msgHandler.sendMessage(`收到谱面同步请求，正在加载谱面...`);
                    };
                    xhr.onload = (e) => {
                        uploader.onload(
                            { target: { result: e.target.response } },
                            { name: "multi.multiSelf.zip" }
                        );
                    };
                },
                loadChartSecond() {
                    $("select-chart").selectedIndex =
                        multi.edata.nowchartOptions.selectedChartNumber;
                    $("select-bgm").selectedIndex = multi.edata.nowchartOptions.selectedMusicNumber;
                    $("select-bg").selectedIndex = multi.edata.nowchartOptions.selectedImageNumber;
                    multi.multiSelf.chartLoaded=true;
                    fetch(
                        `/api/multi/loadChartFinish/${this.room.id}/${new Date().getTime()}`
                    );
                    if(this.startNow) {
                        this.startNow=false;
                        multi.multiSelf.myAlert(
                            [
                                "游戏已经开始，请在准备好后在横屏状态下点击确认按钮立即开始！",
                            ],
                            () => {
                                if(multi.multiSelf.chartLoaded==false) {
                                    return
                                }
                                multi.multiSelf.gaming = true;
                                btnPlay.value == "播放" && btnPlay.click();
                                !full.check() && full.toggle().catch(() => {
                                    app.isFull = !app.isFull;
                                    resizeStage();
                                });
                                multi.multiSelf.panelOpen = false;
                                multi.multiSelf.panelChoice = 0;
                            }
                        );
                    }
                },
                syncChart() {
                    const chartLink = $("load-preset").selectedOptions[0].value;
                    const selectedChartNumber = $("select-chart").selectedIndex;
                    const selectedMusicNumber = $("select-bgm").selectedIndex;
                    const selectedImageNumber = $("select-bg").selectedIndex;
                    const numOfNotes =
                        multi.edata.charts.get($("select-chart").selectedOptions[0].value).numOfNotes;
                    let myHeaders = new Headers();
                    myHeaders.append("Content-Type", "application/json");
                    let request = new Request(
                        `/api/multi/syncChartInfo/${this.room.id}/${new Date().getTime()}`,
                        {
                            method: "POST",
                            mode: "no-cors",
                            body: JSON.stringify({
                                downlink: chartLink,
                                selectedChartNumber: selectedChartNumber>0?selectedChartNumber:0,
                                selectedImageNumber: selectedImageNumber>0?selectedImageNumber:0,
                                selectedMusicNumber: selectedMusicNumber>0?selectedMusicNumber:0,
                                numOfNotes: numOfNotes,
                            }),
                            headers: myHeaders,
                        }
                    );
                    fetch(request).then(() => {
                        msgHandler.sendMessage("谱面已同步，请耐心等待其他玩家完成加载！");
                        multi.multiSelf.room.stage=5
                    });
                },
                gameStart() {
                    fetch(`/api/multi/startGamePlay/${this.room.id}`);
                },
                alertFunc() { },
                uploadScore() {
                    this.gaming = false;
                    this.renewEvents();
                    let scoreData = {
                        accNum: multi.edata.stat.accNum,
                        accStr: multi.edata.stat.accStr,
                        all: multi.edata.stat.all,
                        bad: multi.edata.stat.bad,
                        good: multi.edata.stat.good,
                        great: multi.edata.stat.great,
                        perfect: multi.edata.stat.perfect,
                        scoreNum: multi.edata.stat.scoreNum,
                        scoreStr: multi.edata.stat.scoreStr,
                        maxcombo: multi.edata.stat.maxcombo,
                        extra: "",
                    };
                    if (multi.edata.stat.lineStatus == 1 || multi.edata.stat.lineStatus == 2)
                        scoreData.extra = "ALL PERFECT";
                    else if (multi.edata.stat.lineStatus == 3) scoreData.extra = "FULL COMBO";
                    let myHeaders = new Headers();
                    myHeaders.append("Content-Type", "application/json");
                    let request = new Request(
                        `/api/multi/uploadScoreInfo/${this.room.id}`,
                        {
                            method: "POST",
                            mode: "no-cors",
                            body: JSON.stringify(scoreData),
                            headers: myHeaders,
                        }
                    );
                    fetch(request).then(async (res) => {
                        let res2 = await res.json();
                        msgHandler.sendMessage("分数已上传！");
                        multi.multiSelf.room = res2;
                    });
                },
                nextTrack() {
                    fetch(`/api/multi/nextTrack/${this.room.id}`)
                        .then((res) => res.json())
                        .then((res) => {
                            alert("提交成功！");
                        });
                },
                captureImage(area) {
                    this.timeStr=`于${new Date().format(
                                    "Y-m-d H:i:s"
                                )}`
                    const element=document.querySelector(`#${area}`)
                    if(getComputedStyle(document.body)['color'].toString()=="rgb(255, 255, 255)") { //via夜间模式
                        element.style.background="black"
                    }
                    html2canvas(element, {
                        useCORS: true, // 【重要】开启跨域配置
                        scale: window.devicePixelRatio < 3 ? window.devicePixelRatio : 2,
                        allowTaint: true, // 允许跨域图片
                      }).then((canvas) => {
                        const imgData = canvas.toDataURL('image/jpeg', 1.0);
                        multi.multiSelf.downloadFile(`result${new Date().getTime()}.jpg`, imgData);
                      })
                },
                downloadFile(fileName, content) {
                    let aLink = document.createElement('a')
                    aLink.download = fileName
                    aLink.href = content
                    aLink.click()
                },
                //calibrate
                doCalibrate() {
                    window.location.pathname="/calibrate/"
                },
                //cacheManage
                freshCacheList() {
                    this.cacheList=[]
                    return new Promise((res)=>{
                        const pmNameReg=/charts\/(.+)\.zip/
                        caches.open("PhiSim-Charts")
                            .then(e=>e.keys())
                            .then(e=>{
                                e.forEach((ex)=>{
                                    const name=decodeURIComponent(ex.url.match(pmNameReg)[1])
                                    multi.multiSelf.cacheList.push({name:name,url:ex.url})
                                })
                                res(true)
                            })
                    })
                },
                deleteCache(url) {
                    caches.open("PhiSim-Charts")
                        .then(e=>e.delete(url))
                        .then(async ()=>{
                            await multi.multiSelf.freshCacheList()
                            alert("删除成功！")
                        })
                },
                async openCacheManage() {
                    await this.freshCacheList()
                    window.scrollTo(0,0)
                    this.panelChoice=9999
                    this.panelOpen=true
                },
                
                //打开多人游戏窗口
                async openMultiPanel() {
                    await this.renewRoomInfo()
                    window.scrollTo(0,0)
                    this.panelChoice=0
                    this.panelOpen=true
                }
            }
        });
        return this.multiSelf;
    }
}
multi.init()
const selectbg = $('select-bg');
const btnPlay = $('btn-play');
const btnPause = $('btn-pause');
const selectbgm = $('select-bgm');
const selectchart = $('select-chart');
const msgHandler = {
	nodeText: document.getElementById('msg-out'),
	lastMessage: '',
	sendMessage(msg, type) {
		//const num = this.nodeView.querySelectorAll('.msgbox[type=warn]').length;
		if (type === 'error') {
			this.nodeText.className = 'error';
			this.nodeText.innerText = msg;
		} else {
			this.nodeText.className = 'accept';
			this.nodeText.innerText = msg;
			this.lastMessage = msg;
		}
	}
}
window.onload=function() {
    const inputOffset = $('input-offset');
    if(localStorage['input-offset']) {
        inputOffset.value=localStorage['input-offset']
    }
    if(!navigator.onLine) {
        const loadPreset=$("load-preset")
        while (loadPreset.options.length) loadPreset.options.remove(0);
        const pmNameReg=/charts\/(.+)\.zip/
        caches.open("PhiSim-Charts")
            .then(e=>e.keys())
            .then(e=>{
                return new Promise((res)=>{
                    e.forEach((ex)=>{
                        const name=ex.url.match(pmNameReg)[1]
                        let option=document.createElement("option")
                        option.value=ex.url
                        option.text=decodeURIComponent(name)
                        loadPreset.add(option,null)
                    })
                    res(true)
                })
            })
            .then(()=>{
                alert("已自动进入离线模式，您将只能游玩已经完成下载的谱面！")
            })
    } else {
        fetch(`/api/multi/getLatestVersion`)
            .then((response) => response.json())
            .then(async (result) => {
                function recover() {
                    if (localStorage.lastMultiInfo) {
                        const lastMultiInfo=JSON.parse(localStorage.lastMultiInfo)
                        fetch(`/api/multi/requestRoom/${lastMultiInfo.room.id}`)
                            .then((response) => response.json())
                            .then(async (result) => {
                                if (result.code === -2) {
                                    alert("尝试恢复上次未正常退出的多人游戏失败！如需重新进入多人游戏请点击多人游戏按钮！");
                                    localStorage.removeItem("lastMultiInfo")
                                    return;
                                } else {
                                    if (
                                        confirm(
                                            "看起来您上次并没有正常退出多人游戏，要尝试恢复上次加入的多人游戏吗？"
                                        )
                                    ) {
                                        multi.multiSelf.recoverMulti(JSON.parse(localStorage.lastMultiInfo));
                                        return;
                                    } else localStorage.removeItem("lastMultiInfo"),alert("如需重新进入多人游戏请点击多人游戏按钮！")
                                }
                            })
                    }
                }
                if(window.thisVersion!=result.ver) {
                    if(confirm(`将更新到最新版本v${result.ver}i，确定吗？`)) {
                        caches.delete('PhiSim')
                            .then(()=>location.reload(true))
                    } else recover()
                } else recover()
            })
    }
}