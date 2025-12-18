import {useEffect, useState} from 'react';
import {NativeModules, Share} from 'react-native';
import {OneSignal} from 'react-native-onesignal';
import DeviceInfo from 'react-native-device-info';

const {PipModule} = NativeModules;

type appData = {
  notifications?: boolean;
  appVersion?: string;
  osVersion?: string;
};

type webFunctions = {
  jsDataToInject: string;
  jsFuncToInject: string;
  postMsgHandler: (e: any) => void;
  showFullScreenAd: boolean;
  setShowFullScreenAd: React.Dispatch<React.SetStateAction<boolean>>;
  appInFullscreen: boolean;
  adTargetingIDX: {};
  adUnit: {[key: string]: string} | null;
};

const useWebFunctions = (): webFunctions => {
  const [appData, setAppData] = useState<appData>({
    appVersion: DeviceInfo.getVersion(),
    osVersion: DeviceInfo.getSystemVersion(),
    // status: 'active',
  });
  const [showFullScreenAd, setShowFullScreenAd] = useState<boolean>(false);
  const [appInFullscreen, setAppInFullscreen] = useState<boolean>(false);
  const [adTargetingIDX, setAdTargetingIDX] = useState<{}>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [forceRender, setForceRender] = useState(0);

  const [adUnit, setAdunit] = useState<{[key: string]: string} | null>(null);

  useEffect(() => {
    setTimeout(() => {
      OneSignal.User.pushSubscription.getOptedInAsync().then(optedIn => {
        const data = appData;
        data.notifications = optedIn;

        setAppData({...data});
      });
    }, 3000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const adUnitResponse = await fetch(
        'https://www.c14.co.il/api/app-adunits',
      );

      const adUnitData = await adUnitResponse.json();

      if (adUnitData && adUnitData.android) {
        setAdunit(adUnitData.android);
        setShowFullScreenAd(true);
      }
    })();
  }, []);

  const shareHandler = async (url: string) => {
    await Share.share({
      message: url,
    });
  };

  const handleShowAd = () => {
    setShowFullScreenAd(true);
  };

  const handleWebViewMessage = async (event: any) => {
    const {action, payload} = JSON.parse(event.nativeEvent.data);

    switch (action) {
      case 'share':
        shareHandler(payload.url);
        break;
      case 'ToggleNotifications':
        if (appData.notifications) {
          OneSignal.User.pushSubscription.optOut();
        } else {
          OneSignal.User.pushSubscription.optIn();
          OneSignal.Notifications.requestPermission(true);
        }

        OneSignal.User.pushSubscription.getOptedInAsync().then(optedIn => {
          console.log('change granted', optedIn);
          const data = appData;
          data.notifications = optedIn;
          setAppData({...data});
          setForceRender(prev => prev + 1); // Change state to force re-render
        });

        break;
      case 'fullscreenChange':
        setAppInFullscreen(payload.status);
        PipModule.setFullscreenState(payload.status);
        break;
      case 'triggerMaavron':
        handleShowAd();
        break;
      case 'setMaavaronIdxTargeting':
        setAdTargetingIDX(payload);
        break;
      default:
        break;
    }
  };

  return {
    jsFuncToInject: `
        window.app_functions = {
        nativeShare:(url)=>{
            window.ReactNativeWebView.postMessage(JSON.stringify({
                action:"share",
                payload:{
                  url:url
                }
            }));
         },
        toggleNotifications:()=>{
            window.ReactNativeWebView.postMessage(JSON.stringify({
                action:"ToggleNotifications",
            }));
         },
        showNativeMaavron:()=>{
            window.ReactNativeWebView.postMessage(JSON.stringify({
                action:"triggerMaavron",
            }));
         },
      }



          const dxseg = window.localStorage.getItem(
            "dmp-publisher-prevDefinitionsIds"
          );
          const dxu = window.localStorage.getItem("dmp-publisher-dmpid");
          const permutive = window.localStorage.getItem("dmp-publisher-dmpid");



        window.ReactNativeWebView.postMessage(JSON.stringify({
              action:"setMaavaronIdxTargeting",
               payload:{ dxu, dxseg, permutive }
          }));



        document.addEventListener('fullscreenchange', function (e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'fullscreenChange' , payload:{status:document.fullscreenElement!==null}}));
        });

     
    
      `,
    jsDataToInject: `window.app_data  = ${JSON.stringify(appData)};`,
    postMsgHandler: handleWebViewMessage,
    showFullScreenAd: showFullScreenAd,
    setShowFullScreenAd: setShowFullScreenAd,
    adTargetingIDX,
    appInFullscreen,
    adUnit,
  };
};

export default useWebFunctions;
