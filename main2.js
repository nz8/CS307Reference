// Scheduling function - runs the main function each day class is held, past the end time to ensure all slides have been posted.

function timeRunner(){
    let dlIntervals=[[0*24+12,2*24],[2*24+12,4*24]];
    let cd=new Date();
    let chs=(cd.getDay()-1)*24+cd.getHours();
    function nextInterval(i){
        if (dlIntervals.length-1>i){
            return i+1
        }
        else{
            return 0
        }
    }
    for (let i=0;i<dlIntervals.length;i++){
        if (chs<dlIntervals[i][1]&&chs>dlIntervals[i][0]){
            main();
            setTimeout(function(){main()},Math.abs(chs-dlIntervals[nextInterval(i)][0])*3600*1000);
        }
    }
}

timeRunner();

// Several small functions condensed into and run within one. First, a Selenium driver instance is created
// and used to request the class slides page. Due to how page content is served, it is difficult if not impossible
// to retrieve class slides via a simple http request. Once the page loads, its body is passed to getImageURLs(),
// which extracts all image URLs before calling getDate(). getDate() then processes the informal date string
// present on the class slides page, producing a new date string of the format M.D.Y. Unless a directory with
// that name already exists within parentPath, it creates a new directory with that name there. saveImages() is
// then called to retrieve images from the previously extracted URLs and save them within the appropriate
// date directory. Once the last class slide has been saved, git() is called to aggregate class slides
// and update the web page.

let user=require('username').sync();
let parentPath='c:/users/'+user+'/documents/cs307/';

function main(){
    let r=require('request');
    let fs=require('fs');
    let u=require('username');

    const {Builder} = require('selenium-webdriver');
    let driver = new Builder()
        .forBrowser('firefox')
        .build()
        .then(driver=>{
        driver.get('http://www.cs.uah.edu/~rcoleman/CS307/TodaysClass/TodaysClass.html').then(()=>{
            driver.getPageSource().then(function(y){getImageURLs(y);driver.quit();});
})

});

    function getImageURLs(x){
        let imgL=x.indexOf('<img');
        let noImagesLeft=0;
        let imageURLArray=[];
        while (noImagesLeft==0){
            let imageURLFQuote=x.indexOf('"',imgL);
            let imageURLCQuote=x.indexOf('"',imageURLFQuote+1);
            imageURLArray.push(x.slice(imageURLFQuote+1,imageURLCQuote));
            imgL=x.indexOf('<img',imgL+1);
            if (imgL==-1){noImagesLeft=1}
        }
        genPath(imageURLArray,x);
    }

    function genPath(imageURLArray,x){
        if (parentPath.length<1){
            u().then(user=>{
                parentPath='C:/Users/'+user+'/Documents/CS307/';
            if(!fs.existsSync(parentPath)){fs.mkdirSync(parentPath)}
            getDate(x);
        })}
        else{
            if(!fs.existsSync(parentPath)){
                fs.mkdirSync(parentPath);
            }
            getDate(x);
        }

        function getDate(x){
            let months=['january','february','march','april','may','june','july','august','september','october','november','december'];
            let xL=x.toLowerCase();
            for (let i=0;i<months.length;i++){
                let monthL=xL.indexOf(months[i]);
                if (monthL!=-1) {
                    if (xL.slice(monthL-30,monthL).indexOf('<h1>')!=-1) {
                        for (let j = monthL; j < monthL + 30; j++) {
                            if ((!isNaN(xL[j]))&&xL[j]!=' ') {
                                let dayOfMonth=xL.slice(j,j+2).trim();
                                if (dayOfMonth[1]=='<'){
                                    dayOfMonth=dayOfMonth[0];
                                }
                                break;
                            }
                        }
                        let d=new Date();
                        let cd=(i+1)+'.'+dayOfMonth+'.'+d.getFullYear();
                        parentPath=parentPath+cd+'/';
                        if (!fs.existsSync(parentPath)){
                            fs.mkdirSync(parentPath);
                        }
                        saveImages(imageURLArray);
                        break;
                    }
                }
            }
        }
    }

    function saveImages(x){
        let imageData=[];
        function saveImage(y){
            r({url:'http://www.cs.uah.edu/~rcoleman/CS307/TodaysClass/Images/'+x[y].slice(x[y].indexOf('/')+1),encoding:'binary'},function(e,r,b){
                fs.writeFileSync(parentPath+x[y].slice(x[y].indexOf('/')+1),b,'binary');
                imageData.push(x[y]+' : '+b.length);
                y++;
                if (y<x.length){
                    saveImage(y);
                }
                else{
                    fs.writeFileSync(parentPath+'imagedata.txt',imageData.join('\r\n'),'utf8');
                    git();
                }
            })
        }
        saveImage(0);
    }
}



// Aggregates slide images, creates a data structure for efficiently storing and referencing them, and pushes changes to Github.
function git(){
    // Returns a string's terminating number.
    function trailingNum(i){
        let j=i.length-1;
        while (!isNaN(i[j])){
            j--;
        }
        return parseInt(i.slice(j+1));
    }
    // Removes a topic string's terminating number along with an underscore or dash if one separates the terminating number from the rest of the string.
    function stripNums(imgStr){
        if (imgStr.indexOf('_')!=-1&&imgStr.lastIndexOf('_')>imgStr.length-5){
            return imgStr.slice(0,imgStr.lastIndexOf('_'));
        }
        else if (imgStr.indexOf('-')!=-1&&imgStr.lastIndexOf('-')>imgStr.length-5){
            return imgStr.slice(0,imgStr.lastIndexOf('-'));
        }
        else{
            let i=imgStr.length-1;
            while (!isNaN(imgStr[i])){
                i--;
            }
            return imgStr.slice(0,i+1);
        }
    }

    let fs=require('fs');
    let user=require('username').sync();

    let gitParent='c:/users/'+user+'/documents/github/cs307reference/';
    let destDirParent=gitParent+'images';
    if (!fs.existsSync(destDirParent)){
        fs.mkdirSync(destDirParent);
    }


    /*
    The next 50 or so lines are responsible for aggregating slide images from their respective date directories and
    creating a data structure for efficiently storing and referencing them. Images remain grouped by date, and an array
    called 'dates' is created to store them. Within the 'dates' array, images are grouped by topic but individual image
    names are not directly stored. Since each image's name consists of the topic covered followed by the slide number
    and potentially a separating dash or underscore, it is possible to reference each image name with only the topic name,
    a slide number, and potentially a separator. Within the 'dates' array exist date objects, each of which contains a
    'topics' array that stores the images of that topic covered that day with the topic name and the number of the first
    and last slide image covered that day. The separator type is also stored, but within the 'topics' object. This is
    sufficient to reconstruct the names of all covered images. The 'topics' object stores each topic's total slide image and
    separator.
    */
    let processedImages=[];
    let dates=[];
    let topics={};
    processedImages=fs.readdirSync(destDirParent);

    fs.readdir(parentPath,function(e,f){
        for (let j=0;j<f.length;j++){
            let currPI=fs.readdirSync(parentPath+f[j]);
            let tDate={};
            tDate.date=f[j];
            tDate.topics={};
            for (let k=0;k<currPI.length;k++){
                if (fs.statSync(parentPath+f[j]+'/'+currPI[k]).size>7000&&currPI[k].indexOf('.jpg')!=-1) {
                    let cImage=currPI[k].slice(0,currPI[k].indexOf('.jpg'));
                    let tTopic=stripNums(cImage);
                    let imageNumber=trailingNum(cImage);
                    if (!topics.hasOwnProperty(tTopic)){
                        topics[tTopic]={count:0};
                        let separator='';
                        let l=cImage.length-1;
                        while (!isNaN(cImage[l])){
                            l--;
                        }
                        if (cImage[l]=='_'){
                            separator='_';
                        }
                        else if(cImage[l]=='-'){
                            separator='-';
                        }
                        topics[tTopic]['separator']=separator;
                    }
                    if (!tDate['topics'].hasOwnProperty(tTopic)){
                        tDate['topics'][tTopic]=[imageNumber,imageNumber];
                    }
                    else if (imageNumber<tDate['topics'][tTopic][0]){
                        tDate['topics'][tTopic][0]=imageNumber;
                    }
                    else if (imageNumber>tDate['topics'][tTopic][1]){
                        tDate['topics'][tTopic][1]=imageNumber;
                    }
                    if (processedImages.indexOf(currPI[k])==-1){
                        processedImages.push(currPI[k]);
                        let currImage=fs.readFileSync(parentPath+f[j]+'/'+currPI[k]);
                        fs.writeFileSync(destDirParent+'/'+currPI[k],currImage);
                    }}
            }
            dates.push(tDate);
        }

        for (let i=0;i<dates.length;i++){
            for (let p in dates[i]['topics']){
                if (topics[p]['count']<dates[i]['topics'][p][1]){
                    topics[p]['count']=dates[i]['topics'][p][1];
                }
            }
        }
        sortDates();
    });

    // Basic swap sort since some dates are read out of order, could probably also apply built-in array sort to childDirs.
    function sortDates(){


        function swap(x,y){
            let tx=dates[x];
            dates[x]=dates[y];
            dates[y]=tx;
        }

        for (let i=0;i<dates.length;i++){
            let m1=parseInt(dates[i].date.slice(0,dates[i].date.indexOf('.')));
            let d1=parseInt(dates[i].date.slice(dates[i].date.indexOf('.')+1,dates[i].date.indexOf('.',dates[i].date.indexOf('.')+1)));
            for (let j=i;j<dates.length;j++){
                let m2=parseInt(dates[j].date.slice(0,dates[j].date.indexOf('.')));
                let d2=parseInt(dates[j].date.slice(dates[j].date.indexOf('.')+1,dates[j].date.indexOf('.',dates[j].date.indexOf('.')+1)));
                if ((m2<m1)||m1==m2&&d2<d1){
                    swap(i,j);
                    m1=parseInt(dates[i].date.slice(0,dates[i].date.indexOf('.')));
                    d1=parseInt(dates[i].date.slice(dates[i].date.indexOf('.')+1,dates[i].date.indexOf('.',dates[i].date.indexOf('.')+1)));
                }
            }
        }
        injectData();

    }

    // Injects data from dates and topics into specified HTML file by setting corresponding variables within the first <script></script> in the page.
    function injectData(){

        let htmlFP=gitParent+'index.html';
        let html=fs.readFileSync(htmlFP);

        let s=html.indexOf('<script');
        let h1=html.slice(0,s);
        let h2=html.slice(s);

        if (h2.indexOf('let dates')==-1){}
        else{h2=h2.slice(h2.indexOf('</script>')+9)}
        html=h1+'<script>'+'let dates='+JSON.stringify(dates)+';'+'let topics='+JSON.stringify(topics)+';'+'</script>'+h2;

        fs.writeFileSync(htmlFP,html,'utf8');
        gitSync();
    }

    // Runs AHK script that pushes changes to Github.
    function gitSync(){
        let cp=require('child_process');
        cp.execFileSync(gitParent+'scripts/gitSync.exe')
    }



}
