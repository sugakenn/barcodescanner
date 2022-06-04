# barcodescanner class

![image](https://github.com/sugakenn/barcodescanner/blob/main/image.jpg)

バーコードスキャンライブラリ[QuaggaJS](https://serratus.github.io/quaggaJS/)のブラウザ実装です。日本語の解説は[ブログ:「QuaggaJSを使ってブラウザでバーコードスキャン」](https://nanbu.marune205.net/2021/12/barcode-scan-quaggajs.html?m=1)に載せています。

A browser implementation of the barcode scan library [QuaggaJS](https://serratus.github.io/quaggaJS/)

# Require
[QuaggaJS](https://serratus.github.io/quaggaJS/)

# Optional
[WebRTC adapter](https://github.com/webrtc/adapter)

# Usage
- import QuaagaJS
- import WebRTC adapter(Optional)
- import or copy barcodescanner.js
- write html
  
  &lt;div clas="control"&gt;&lt;input type="tel" id="barcode-input" maxlength="13" /&gt;&lt;button onClick="toggleScan()"&gt;start/stop&lt;/button&gt;&lt;/div&gt;
  
  &lt;div id="barcode-wrapper" style="visibility: hidden; border: 2px solid #099;"&gt;
  
  &lt;canvas id="barcode-view"&gt;&lt;/canvas&gt;
  
  &lt;p id="message"&gt;initializing camera&lt;/p&gt;
  
  &lt;/div&gt;

- make instance in script like this
  
  const barcodescanner = new (
  videoSizeW, videoSizeH, 
  viewSizeW, viewSizeH,
  targetSizeW, targetSizeH,
  borderLineSize,
  scanInterval,
  validationCnt);
  
  - videoSize: Background video size.
  - viewSize: View in HTML size.
  - targetSize: Area of sending QuaagaJS
  - borderLineSize: guide line size
  - scanInterval: Interval to send to QuaagaJS(milliseconds)
  - validationCnt: If the same code value is obtained the specified number of times, it is considered successful.
  
The html button event calls the method in the barcodescanner.js class b to window.togglescan
