/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useRef, useState} from 'react';
import {WebView, WebViewNavigation} from 'react-native-webview';
import FullScreenAd from './components/ads/AppOpenAd';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {
  BackHandler,
  StyleSheet,
  ToastAndroid,
  Platform,
  Linking,
  StatusBar,
  AppStateStatus,
  AppState,
  View,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import SplashScreen from 'react-native-splash-screen';
import PullToReload from './components/ui/PullToReload';
import useWebFunctions from './hooks/useWebFunctions';
import {LogLevel, OneSignal} from 'react-native-onesignal';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import KeepAwake from 'react-native-keep-awake';

OneSignal.initialize('83e276cc-c7e8-4693-b306-d9874f2507de');
OneSignal.Debug.setLogLevel(LogLevel.Verbose);

const TIMEOUT = 1000 * 60 * 5;
// const TIMEOUT = 1000;

const AppContent: React.FC<{}> = () => {
  const insets = useSafeAreaInsets();

  const webViewRef = useRef<WebView | null>(null);
  const [customUserAgent, setCustomUserAgent] = useState<string | null>(null);
  const [webUrl, setWebUrl] = useState<string>('https://www.c14.co.il/');
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [toastExit, setToastExit] = useState<boolean>(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [statusBarColor, setStatusBarColor] = useState<string>('#d21d23');
  const [navigationBarColor, setNavigationBarColor] =
    useState<string>('#ffffff');
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const lastBackgroundTime = useRef<number | null>(null);

  const {
    jsDataToInject,
    jsFuncToInject,
    postMsgHandler,
    showFullScreenAd,
    setShowFullScreenAd,
    appInFullscreen,
    adTargetingIDX,
    adUnit,
  } = useWebFunctions();

  const handleExternalLink = (request: any) => {
    if (Platform.OS === 'android') {
      const isInternalLink =
        request.url.startsWith('https://www.c14.co.il/') ||
        request.url.startsWith('https://c14.co.il') ||
        request.url.startsWith('https://podcast.c14.co.il') ||
        request.url.startsWith('https://www.now14.co.il');
      if (!isInternalLink) {
        setShowFullScreenAd(false);
        Linking.openURL(request.url);
        return false;
      }
    }
    return true;
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    if (navState.url === 'https://www.c14.co.il/live') {
      setNavigationBarColor('#0c0e55');
      setStatusBarColor('#0c0e55');
    } else if (navState.url.startsWith('https://podcast.c14.co.il/')) {
      setNavigationBarColor('#1b1a1f');
      setStatusBarColor('#1b1a1f');
    } else {
      setStatusBarColor('#d21d23');
      setNavigationBarColor('#ffffff');
    }

    setCanGoBack(navState.canGoBack);
  };

  const handleBackPress = React.useCallback(() => {
    if (canGoBack) {
      webViewRef.current?.goBack();
      return true;
    } else {
      if (webUrl !== 'https://www.c14.co.il/') {
        setWebUrl('https://www.c14.co.il/');
        setForceUpdate(prev => prev + 1);
        return true;
      } else if (!toastExit) {
        ToastAndroid.show('לחצו שוב ליציאה', 4000);
        setToastExit(true);
        setTimeout(() => {
          setToastExit(false);
        }, 3000);
        return true;
      }

      BackHandler.exitApp();
    }
  }, [canGoBack, toastExit, webUrl]);

  // (async () =>
  //   console.log(await OneSignal.User.pushSubscription.getIdAsync()))();

  // (async () =>
  //   console.log(await OneSignal.User.pushSubscription.getOptedInAsync()))();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appInFullscreen || showFullScreenAd) {
        return;
      }

      if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        lastBackgroundTime.current = Date.now();
      }

      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        const now = Date.now();
        if (
          lastBackgroundTime.current &&
          now - lastBackgroundTime.current > TIMEOUT
        ) {
          setWebUrl('https://www.c14.co.il');
          SplashScreen.show();
          setForceUpdate(prev => prev + 1);
        }
      }

      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [appInFullscreen, showFullScreenAd]);

  useEffect(() => {
    if (appInFullscreen) {
      KeepAwake.activate();
    } else {
      KeepAwake.deactivate();
    }
  }, [appInFullscreen]);

  useEffect(() => {
    changeNavigationBarColor(
      navigationBarColor,
      navigationBarColor === '#ffffff' ? true : false,
      false,
    );
  }, [navigationBarColor]);

  useEffect(() => {
    StatusBar.setBackgroundColor(statusBarColor, false);
  }, [statusBarColor]);

  useEffect(() => {
    const fetchUserAgent = async () => {
      const userAgent = await DeviceInfo.getUserAgent();
      setCustomUserAgent(userAgent + ' now14' + Platform.OS);
    };

    //setShowFullScreenAd(true);
    fetchUserAgent();
  }, [setShowFullScreenAd]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );

    return () => {
      backHandler.remove();
    };
  }, [handleBackPress]);

  useEffect(() => {
    const handleDeepLink = (event: {url: string}) => {
      lastBackgroundTime.current = Date.now();
      const url = event.url;
      if (
        url.startsWith('https://www.c14.co.il/') ||
        url.startsWith('https://c14.co.il') ||
        url.startsWith('https://podcast.c14.co.il') ||
        url.startsWith('https://www.now14.co.il')
      ) {
        setWebUrl(url);
        setForceUpdate(prev => prev + 1);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then(url => {
      if (url) {
        setWebUrl(url);
        setForceUpdate(prev => prev + 1);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    OneSignal.Notifications.requestPermission(false);

    const handleNotificationClick = (event: any) => {
      const url =
        event.notification.launchURL ||
        event.notification.additionalData?.url ||
        'https://www.c14.co.il/';

      if (url) {
        Linking.openURL(url).catch(err =>
          console.error('Failed to open URL:', err),
        );
      }
    };

    OneSignal.Notifications.addEventListener('click', handleNotificationClick);

    return () => {
      OneSignal.Notifications.removeEventListener(
        'click',
        handleNotificationClick,
      );
    };
  }, []);

  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current?.injectJavaScript(jsDataToInject);
    }
  }, [jsDataToInject, webViewRef]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}>
      <View
        style={{
          height: insets.top,
          position: 'absolute',
          top: 0,
          backgroundColor: statusBarColor,
          width: '100%',
        }}
      />
      <View
        style={{
          height: insets.bottom,
          position: 'absolute',
          bottom: 0,
          backgroundColor: navigationBarColor,
          width: '100%',
        }}
      />
      <StatusBar
        backgroundColor={statusBarColor}
        translucent={true}
        barStyle="light-content"
      />

      {customUserAgent && (
        <PullToReload webViewRef={webViewRef}>
          <WebView
            key={forceUpdate}
            cacheEnabled={true}
            cacheMode="LOAD_NO_CACHE"
            domStorageEnabled={true}
            ref={ref => {
              webViewRef.current = ref;
            }}
            source={{uri: webUrl}}
            onShouldStartLoadWithRequest={handleExternalLink}
            onNavigationStateChange={handleNavigationStateChange}
            javascriptEnabled={true}
            useWebKit={true}
            userAgent={customUserAgent}
            injectedJavaScript={jsFuncToInject}
            onMessage={postMsgHandler}
            setBuiltInZoomControls={false}
            allowsFullscreenVideo={true}
            allowsBackForwardNavigationGestures={true}
            onLoad={() => {
              webViewRef.current?.injectJavaScript(jsDataToInject);
            }}
            onLoadStart={() => {}}
            onLoadEnd={() => {
              SplashScreen.hide();
            }}
            renderLoading={() => <></>}
          />
        </PullToReload>
      )}

      {adUnit !== null && (
        <FullScreenAd
          show={showFullScreenAd}
          onAdClosed={() => setShowFullScreenAd(false)}
          targets={adTargetingIDX}
          adUnit={adUnit}
        />
      )}
    </SafeAreaView>
  );
};

const App = () => (
  <SafeAreaProvider>
    <AppContent />
  </SafeAreaProvider>
);

export default App;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const styles = StyleSheet.create({
  container: {backgroundColor: '#fff', flex: 1},
});
