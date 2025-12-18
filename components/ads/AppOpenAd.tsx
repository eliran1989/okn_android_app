import {useCallback, useEffect, useRef, useState} from 'react';
import {InterstitialAd, AdEventType} from 'react-native-google-mobile-ads';

export default function FullScreenAd({
  show,
  onAdClosed,
  targets,
  adUnit,
}: {
  show: boolean;
  onAdClosed: () => void;
  targets?: Record<string, string>;
  adUnit: {[key: string]: string};
}) {
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const interstitialRef = useRef<InterstitialAd | null>(null);
  const listenersRef = useRef<(() => void)[]>([]);

  const loadAd = useCallback(
    (adUnitId: string, localTargets: Record<string, string> | undefined) => {
      // ניקוי מאזינים
      listenersRef.current.forEach(unsub => unsub?.());
      listenersRef.current = [];

      setIsAdLoaded(false);

      const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
        ...(localTargets && {
          customTargeting: localTargets,
        }),
      });

      interstitialRef.current = interstitial;

      let didLoad = false;
      let timeoutId: NodeJS.Timeout;

      timeoutId = setTimeout(() => {
        if (!didLoad) {
          console.log('No ad fill → triggering onAdClosed()');
          onAdClosed();
        }
      }, 4000);

      const unsubLoaded = interstitial.addAdEventListener(
        AdEventType.LOADED,
        () => {
          console.log('load');
          didLoad = true;
          clearTimeout(timeoutId);
          setIsAdLoaded(true);
        },
      );

      const unsubClosed = interstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log('close');
          clearTimeout(timeoutId);
          setIsAdLoaded(false);
          onAdClosed();
          loadAd(adUnit.article, targets);
        },
      );

      const unsubError = interstitial.addAdEventListener(
        AdEventType.ERROR,
        error => {
          console.log('error');
          clearTimeout(timeoutId);
          console.log('Ad load error:', error);
          onAdClosed();
        },
      );

      listenersRef.current.push(unsubLoaded, unsubClosed, unsubError);
      interstitial.load();
    },
    [onAdClosed, targets, adUnit],
  );

  useEffect(() => {
    loadAd(adUnit.hp, targets);
    return () => {
      listenersRef.current.forEach(unsub => unsub?.());
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (show && isAdLoaded && interstitialRef.current) {
      try {
        interstitialRef.current.show();
      } catch (error) {}
    }
  }, [show, isAdLoaded, onAdClosed]);

  return null;
}
