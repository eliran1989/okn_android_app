import React, {ReactNode, useCallback, useState} from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import WebView from 'react-native-webview';

const wait = (timeout: number) =>
  new Promise(resolve => setTimeout(resolve, timeout));

interface PullToReloadProps {
  children: ReactNode; // Use ReactNode to support any valid child
  webViewRef: React.RefObject<WebView | null>;
}

const PullToReload: React.FC<PullToReloadProps> = ({children, webViewRef}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [enablePtr, setEnablePtr] = useState(false);

  const onRefresh = useCallback(() => {
    webViewRef.current?.reload();
    setRefreshing(true);
    wait(2000).then(() => setRefreshing(false));
  }, [webViewRef]);

  const handleScrollEvent = (e: any) => {
    if (Platform.OS === 'android') {
      setEnablePtr(e.nativeEvent.contentOffset.y <= 100);
    } else {
      if (e.nativeEvent.contentOffset.y < 0) {
        webViewRef.current?.reload();
        setRefreshing(true);
        wait(1000).then(() => setRefreshing(false));
      }
    }
  };

  const clonedChild = React.isValidElement(children)
    ? React.cloneElement(children, {
        ...children.props,
        onScroll: (e: any) => handleScrollEvent(e),
      })
    : children;

  return (
    <ScrollView
      scrollEnabled={false}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          enabled={enablePtr}
        />
      }
      style={{flex: 1}}>
      <View />
      {clonedChild}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {backgroundColor: '#fff', flex: 1},
});

export default PullToReload;
