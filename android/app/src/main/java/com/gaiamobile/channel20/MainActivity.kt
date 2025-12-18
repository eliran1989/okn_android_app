
package com.gaiamobile.channel20

import android.os.Bundle
import android.view.WindowInsetsController
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.ReactActivity
import org.devio.rn.splashscreen.SplashScreen


import android.os.Build
import android.util.Log
import android.util.Rational
import android.app.PictureInPictureParams

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
        SplashScreen.show(this)
        super.onCreate(savedInstanceState)


  }


companion object {
    @JvmField
    var isWebViewFullscreen: Boolean = false
}


  override fun getMainComponentName(): String {
    return "now14"
  }



    override fun onUserLeaveHint() {
        super.onUserLeaveHint()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !isInPictureInPictureMode) {
            if (isWebViewFullscreen) {
                val aspectRatio = Rational(16, 9)
                val pipParams = PictureInPictureParams.Builder()
                    .setAspectRatio(aspectRatio)
                    .build()
                enterPictureInPictureMode(pipParams)
                Log.d("PiP", "Entering PiP from fullscreen")
            } else {
                Log.d("PiP", "Skipped PiP – not in fullscreen")
            }
        }
    }


}
