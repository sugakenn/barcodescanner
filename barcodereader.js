class BarcodeReader {

    //競合する場合は修正する
    //html target
    wrapperId="barcode-wrapper";
    viewId="barcode-view";
    messageId="message";
    inputId="itemcd";
    //----

    videoSize = {w:640, h:480};  //hidden 
    viewSize = {w:300, h:200};   //display size
    targetSize = {w:150, h:80, border: 2};  //guide size
    wrapperElement=null;//この領域を表示・非表示にする
    viewElement = null;//表示される画像要素
    viewContext = null;//表示される画像要素のコンテキスト
    targetElement = null;//バーコード部の要素
    targetContext=null;//バーコード部のコンテキスト
    inputElement = null;//結果が戻る要素 value値にセットする
    messageElement=null;//エラー時メッセージがinnerHTMLとしてセットされる
    blnCameraInit = false;//カメラ初期化が正常終了したかどうか
    video = null;
    scanInterval = 100;//スキャンインターバル
    validationCnt = 3; //スキャンチェック回数
    validatainWkCnt = 0;//スキャンチェックワーク(回数)
    validationCode = "";//スキャンチェックワーク(コード)
    
    blnScaning = false;//スキャン中かどうか
    reserveEnd=null;//スキャン終了予約

    //表示領域用のパラメータ
    viewParam = {
        init: false,
        sx: 0,
        sy: 0,
        sw: 0,
        sh: 0,
        dx: 0,
        dy: 0,
        dw: 0,
        dh: 0
    };

    //バーコードスキャン部分のパラメータ
    targetParam = {
        sx: 0,
        sy: 0,
        sw: 0,
        sh: 0,
        dx: 0,
        dy: 0,
        dw: 0,
        dh: 0
    };

    //バーコードガイドのパラメータ
    sqParam = {
        valid : false,
        x: 0,
        y: 0,
        w: 0,
        h: 0
    };

    // Quagga用のパラメータ
    // Param for QuaggaJS
    qConfig={
        locate: true,
        decoder: { 
            readers: ["ean_reader","ean_8_reader"], //barcode type 対象のバーコードタイプ
            multiple: false, //同時に複数のバーコードを解析しない
        },
        locator: {
            halfSample: false,
            patchSize: "large"
        },
        src:''//後から指定
    };

    constructor(
        videoSizeW, videoSizeH, 
        viewSizeW, viewSizeH,
        targetSizeW, targetSizeH,border,
        scanInterval, validationCnt) {
        
        //上記のコードを出力する都合上、togglescanという名前で呼び出したいのでwindowに関数をthisをバインドしてセット
        window.toggleScan = this.toggleScan.bind(this);
        
        this.videoSize.w = videoSizeW;
        this.videoSize.h  = videoSizeH;
        this.viewSize.w = viewSizeW;
        this.viewSize.h  = viewSizeH;
        this.targetSize.w = targetSizeW;
        this.targetSize.h  = targetSizeH;
        this.targetSize.border = border;

        this.wrapperElement=document.getElementById(this.wrapperId);
        this.viewElement=document.getElementById(this.viewId);
        this.viewContext = this.viewElement.getContext("2d");;
        this.messageElement=document.getElementById(this.messageId);
        this.inputElement = document.getElementById(this.inputId);
        //バーコード部
        this.targetElement = document.createElement("canvas");
        this.targetContext = this.targetElement.getContext("2d");

        this.validationCnt = validationCnt;
        this.scanInterval = scanInterval;

        //カメラ映像領域作成（非表示）
        this.video = document.createElement("video");
        this.video.muted=true;
        this.video.playsInline=true;
        
    }

    //バーコードスキャン初期化
    initBarcodeScaner() {
    
        console.log(this.videoSize.w+':'+this.videoSize.h);

        //カメラ使用の許可ダイアログが表示される
        navigator.mediaDevices.getUserMedia(
            //マイクはオフ, カメラの設定   背面カメラを希望する 640×480を希望する
            {"audio":false,"video":{facingMode:"environment","width":{"ideal": this.videoSize.w},"height":{"ideal": this.videoSize.h}}}
        ).then(
        //カメラと連携が取れた場合
        (stream)=>{
            this.video.srcObject = stream;

            //Quaggaのスキャンイベント
            Quagga.onDetected((result)=> {
                //スキャンを止める
                
                if (this.blnScaning ==false) {
                    //遅延してスキャンデータが来た場合は無視
                    return;
                }

                if (this.validationCnt <= 1) {
                    this.scanEnd();
                    //コードをセット
                    // barcode set to input element
                    this.inputElement.value=result.codeResult.code;
                } else {
                    if (this.validationCode==result.codeResult.code) {
                        this.validatainWkCnt++;
                        if (this.validationCnt <= this.validatainWkCnt) {
                            this.scanEnd();
                            //コードをセット
                            // barcode set to input element
                            this.inputElement.value=String(result.codeResult.code);
                        }
                    } else {
                        this.validationCode=result.codeResult.code;
                        this.validatainWkCnt = 1;
                    }
                }
            });

            this.blnCameraInit = true;
            this.messageElement.innerHTML="スキャンして下さい。再度ボタン押下で中止"; //PLZ Scan. If Button tap again stop scan. 
        }
        ).catch(
        //エラー時
        (err)=>{
            console.log(err);
            switch(err.message) {
            case "Requested device not found":
                this.messageElement.innerHTML="カメラ取得に失敗しました"; //camera init failed
                break;
            default:
                this.messageElement.innerHTML=err.message;
            }

        　}
        );
    }

    //パラメータ初期化
    initParam() {

        //すでに初期化されていた場合は処理しない
        if (this.viewParam.init) {
            return;
        }

        //実際取得したサイズは要求したサイズと違う際は上書きされる。
        //overwrite real video size(It may not be as requested)
        //videoが開始されていないと0になる
        //If video not start then size is 0 x 0.
        this.videoSize.w=this.video.videoWidth
        this.videoSize.h=this.video.videoHeight;

        //canvasは属性値でサイズを指定する必要がある
        //Canvas size should be set in the attribute.
        this.viewElement.setAttribute("width",this.viewSize.w);
        this.viewElement.setAttribute("height",this.viewSize.h);

        //表示領域の計算
        //calc display aria size
        if (this.videoSize.w <= this.viewSize.w) {
            //元のサイズの方が小さかったらそのまま
            this.viewParam.sx = 0;
            this.viewParam.sw = this.videoSize.w;
            
            this.viewParam.dx = 0;
            this.viewParam.dw = this.videoSize.w;
        } else {
            //中央部を取得
            //get the center point of X.
            let wk = this.videoSize.w - this.viewSize.w;
            if (wk < 0) {
                this.messageElement.innerHTML="サイズ設定不備(view-X)"; //size error x
                console.log("view-x");
                this.blnCamerainit = false;
                return;
            }
            wk = wk /2; //中央寄せするので÷2 divide by 2 for centering

            this.viewParam.sx = wk;
            this.viewParam.sw = this.viewSize.w;
            
            this.viewParam.dx = 0;
            this.viewParam.dw = this.viewSize.w;
        }
        if (this.videoSize.h <= this.viewSize.h) {
            //元のサイズの方が小さかったらそのまま // If the original size is smaller, leave it as it is
            this.viewParam.sy = 0;
            this.viewParam.sh = this.videoSize.h;
            
            this.viewParam.dy = 0;
            this.viewParam.dh = this.videoSize.h;
        } else {
            //中央部を取得
            //get the center point of Y.
            let wk = this.videoSize.h - this.viewSize.h;
            if (wk < 0) {
                this.messageElement.innerHTML="サイズ設定不備(view-Y)";//size error y
                console.log("view-y");
                this.blnCameraInit = false;
                return;
            }
            wk = wk /2; //中央寄せするので÷2 //divide by 2 for centering

            this.viewParam.sy = wk;
            this.viewParam.sh = this.viewSize.h;
            
            this.viewParam.dy = 0;
            this.viewParam.dh = this.viewSize.h;
        }

        //バーコードスキャン部分の計算
        //calc scan area size.
        if (this.videoSize.w <= this.targetSize.w) {
            //元のサイズの方が小さかったらそのまま// If the original size is smaller, leave it as it is
            this.targetParam.sx = 0;
            this.targetParam.sw = this.videoSize.w;
            
            this.targetParam.dx = 0;
            this.targetParam.dw = this.videoSize.w;
        } else {
            //中央部を取得 //get the center point of x
            let wk = this.videoSize.w - this.targetSize.w;
            if (wk < 0) {
                this.messageElement.innerHTML="サイズ設定不備(target-X)";//Size error x
                console.log("target-x");
                this.blnCamerainit = false;
                return;
            }
            wk = wk /2; //中央寄せするので÷2

            this.targetParam.sx = wk;
            this.targetParam.sw = this.targetSize.w;
            
            this.targetParam.dx = 0;
            this.targetParam.dw = this.targetSize.w;
        }
        if (this.videoSize.h <= this.targetSize.h) {
            //元のサイズの方が小さかったらそのまま
            this.targetParam.sy = 0;
            this.targetParam.sh = this.videoSize.h;
            
            this.targetParam.dy = 0;
            this.targetParam.dh = this.videoSize.h;
        } else {
            //中央部を取得
            let wk = this.videoSize.h - this.targetSize.h;
            if (wk < 0) {
                this.messageElement.innerHTML="サイズ設定不備(target-Y)";
                this.blnCamerainit = false;
                console.log("target-y");
                return;
            }
            wk = wk /2; //中央寄せするので÷2//divide by 2 for centering

            this.targetParam.sy = wk;
            this.targetParam.sh = this.targetSize.h;
            
            this.targetParam.dy = 0;
            this.targetParam.dh = this.targetSize.h;
        }

        //バーコードガイドの設定
        //barcode guide setting
        this.sqParam.valid = true;
        this.sqParam.w = this.targetSize.w;
        this.sqParam.h = this.targetSize.h;
        this.sqParam.x = (this.viewSize.w - this.targetSize.w) / 2;
        if (this.sqParam.x < 0) {
            this.sqParam.valid = false;
        }
        this.sqParam.y = (this.viewSize.h - this.targetSize.h) / 2;
        if (this.sqParam.y < 0) {
            this.sqParam.valid = false;
        }

        this.viewParam.init = true;
    }

    toggleScan() {
        if(this.wrapperElement.style.display=="none") {
            this.scanStart(0);
       
        } else {
            this.scanEnd();
       
        }
    }

    scanStart(intCnt) {

        if (intCnt == 0) {
            //初期化
            this.initBarcodeScaner();
        }

        this.wrapperElement.style.display="block";
        
        //初期化の待ち受け処理
        //timeout setting
        if (this.blnCameraInit==false) {
            if (intCnt < 5) {
                this.reserveEnd = setTimeout(this.scanStart.bind(this,intCnt+1),1000);
                return;
            } else {
                //待ち受けタイムアウト
                this.wrapperElement.style.display="block";
                this.reserveEnd = setTimeout(() => {
                    this.wrapperElement.style.display="none";
                }, 1000);
                return;
            }
        }
        
        this.video.play();
        this.blnScaning = true;   
        setTimeout(this.scanning.bind(this),200);
    }
    
    scanning() {
        //スキャン本体
        //scan(main)
        if (this.blnScaning == false) {
            return;
        }

        //パラメータ初期化()
        //init param
        this.initParam();

        //バーコードエリアに線画
        //From video to canvas for barcode analysis
        this.targetContext.drawImage(this.video,this.targetParam.sx,this.targetParam.sy,this.targetParam.sw,this.targetParam.sh,this.targetParam.dx,this.targetParam.dy,this.targetParam.dw,this.targetParam.dh);

        //線画からバーコード解析
        //canvas to QuaagaJS
        this.targetElement.toBlob((blob)=>{
                let reader = new FileReader();
                reader.onload=()=>{
                this.qConfig.src=reader.result;
                Quagga.decodeSingle(this.qConfig,function(){});
            }
            reader.readAsDataURL(blob);
        });
        
        //プレビューエリアに線画
        //From video to canvas for pveview
        this.viewContext.drawImage(this.video,this.viewParam.sx,this.viewParam.sy,this.viewParam.sw,this.viewParam.sh,this.viewParam.dx,this.viewParam.dy,this.viewParam.dw,this.viewParam.dh);

        //バーコードガイドの線画
        //paint square guide
        if(this.sqParam.valid) {
            this.viewContext.beginPath();
            this.viewContext.strokeStyle="rgb(255,0,0)";
            this.viewContext.lineWidth=this.targetSize.border;
            this.viewContext.rect(this.sqParam.x,this.sqParam.y,this.sqParam.w,this.sqParam.h);
            this.viewContext.stroke();
        }

        //再帰
        //Recursion
        setTimeout(this.scanning.bind(this),this.scanInterval);
    }
    
    scanEnd() {
        if (this.reserveEnd != null) {
            clearTimeout(this.reserveEnd);
        }
        this.blnScaning = false;
        this.video.pause();
        this.wrapperElement.style.display="none";
        this.validatainWkCnt = 0;
        this.validationCode="";

        //コンテキストクリア
        //context clear
        this.targetContext.clearRect(0,0,this.targetParam.dw,this.targetParam.dh);
        this.viewContext.clearRect(0,0,this.viewParam.dw,this.viewParam.dh);

        //カメラ停止
        //video stop
        let mediastream = this.video.srcObject;
        let tracks = mediastream.getTracks();
        
        tracks.forEach(function(track) {
           //mediastream.removeTrack(track);
           track.stop();
        });
        this.video.srcObject=null;
        this.blnCameraInit==false
        
    }

}
