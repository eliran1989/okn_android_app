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
};

const useWebFunctions = (): webFunctions => {
  const [appData, setAppData] = useState<appData>({
    appVersion: DeviceInfo.getVersion(),
    osVersion: DeviceInfo.getSystemVersion(),
    // status: 'active',
  });
  const [showFullScreenAd, setShowFullScreenAd] = useState<boolean>(false);
  const [appInFullscreen, setAppInFullscreen] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [forceRender, setForceRender] = useState(0);

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

  const shareHandler = async (url: string) => {
    await Share.share({
      message: url,
    });
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


        document.addEventListener('fullscreenchange', function (e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'fullscreenChange' , payload:{status:document.fullscreenElement!==null}}));
        });

     
    
      `,
    jsDataToInject: `window.app_data  = ${JSON.stringify(appData)};`,
    postMsgHandler: handleWebViewMessage,
    showFullScreenAd: showFullScreenAd,
    setShowFullScreenAd: setShowFullScreenAd,
    appInFullscreen,
  };
};

export default useWebFunctions;
