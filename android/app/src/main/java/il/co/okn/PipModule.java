package il.co.okn;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class PipModule extends ReactContextBaseJavaModule {

  public PipModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "PipModule";
  }

  @ReactMethod
  public void setFullscreenState(boolean isFullscreen) {
    MainActivity.isWebViewFullscreen = isFullscreen;
  }
}
