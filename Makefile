

include ../Make.mk

ALIAS    := Psygraph
KEYSTORE := ../certificates/psygraph.keystore
SIGN_APP  = jarsigner -sigalg SHA1withRSA -digestalg SHA1 -keystore $(KEYSTORE) -storepass sregor $(RELEASE_APP_ANDROID).unaligned $(ALIAS)

ifeq ($(ARCH),Darwin)
  ZIPALIGN = /Applications/adt-bundle-mac-x86_64-20130917/sdk/tools/zipalign
else
  ZIPALIGN = zipalign
endif


SRC_FILES  := www/index.html www/offline.appcache www/wp.php
SRC_FILES  += $(wildcard www/js/*.js) $(wildcard www/js/*.map) $(wildcard www/js/skins/*/*)
#SRC_FILES  += $(wildcard www/media/*)
SRC_FILES  += $(wildcard www/html/*.html)
SRC_FILES  += $(wildcard www/html/*.js)
SRC_FILES  += $(wildcard www/css/*.css)
SRC_FILES  += $(wildcard www/img/*.png) www/img/loading.gif
SRC_FILES  += $(addprefix www/css/images/, ajax-loader.gif logo.png)

DEST_FILES := $(subst www/,$(CLIENT_DIR)/,$(SRC_FILES))

ANDROID_DEBUG_BUILD   := $(ROOTDIR)/client/platforms/android/build/outputs/apk/android-debug.apk
ANDROID_RELEASE_BUILD := $(ROOTDIR)/client/platforms/android/build/outputs/apk/android-release-unsigned.apk
IOS_DEBUG_BUILD       := /bits/datum/software/pg/client/platforms/ios/build/device/Psygraph.ipa
IOS_RELEASE_BUILD     := /bits/datum/software/pg/client/platforms/ios/build/device/Psygraph.ipa

PLUGINS  = cordova-plugin-console
PLUGINS += cordova-plugin-device
PLUGINS += cordova-plugin-device-motion
PLUGINS += cordova-plugin-device-orientation
PLUGINS += cordova-plugin-inappbrowser
PLUGINS += cordova-plugin-network-information
PLUGINS += cordova-plugin-splashscreen
PLUGINS += cordova-plugin-statusbar
PLUGINS += cordova-plugin-vibration
PLUGINS += cordova-plugin-whitelist
PLUGINS += cordova-plugin-android-permissions
#PLUGINS += cordova-plugin-keyboard
#PLUGINS += org.transistorsoft.cordova.background-geolocation
#PLUGINS += cordova-plugin-bluetoothle
#PLUGINS += cordova-plugin-apple-watch
PLUGINS += cordova-plugin-ios-disableshaketoedit
PLUGINS += de.appplant.cordova.plugin.local-notification
# the following for IOS10
# cordova plugin add https://github.com/EddyVerbruggen/cordova-plugin-local-notifications
#PLUGINS += https\://github.com/katzer/cordova-plugin-background-mode.git
#PLUGINS += cordova-plugin-background-mode

ADD_PLUGINS := $(PLUGINS)
RM_PLUGINS  := $(PLUGINS)

# Unhandled dependencies.
ADD_PLUGINS += cordova-plugin-file cordova-plugin-media cordova-plugin-file-transfer
#ADD_PLUGINS += cordova-plugin-dialogs cordova-plugin-geolocation cordova-plugin-background-geolocation
ADD_PLUGINS += cordova-plugin-dialogs cordova-plugin-geolocation cordova-plugin-mauron85-background-geolocation

RM_PLUGINS  += cordova-plugin-file-transfer cordova-plugin-media cordova-plugin-file
RM_PLUGINS  += cordova-plugin-background-geolocation cordova-plugin-geolocation cordova-plugin-dialogs

.PHONY: $(PLUGINS) plugins platforms all build icon

default: sync

both:
	$(MAKE) all
	$(MAKE) all TARGET_ARCH=Android

all: build

build: icon

icon : $(ICON_TS)
$(ICON_TS) : res/icon.png res/splash.png Makefile #platforms/ios/psygraph/resources/icons/icon.png
	cordova-icon --icon res/icon.png
	cordova-splash --splash res/greySplash.png
	touch $@


ifeq ($(TARGET_ARCH),IOS)
  install : install_ios
else
  install : install_android
endif

arch:
	@echo $(ARCH) $(TARGET_ARCH)

ifeq ($(DEBUG),1)
  ifeq ($(TARGET_ARCH),IOS)
    build : $(DEBUG_APP_IOS)
  else
    build : $(DEBUG_APP_ANDROID) 
  endif
  INSTALL_FLAG := --debug
  #IOS_IDENTITY=iPhone Developer
  #IOS_IDENTITY=iPhone Developer: Alec Rogers (H44P37QRAD)
else
  ifeq ($(TARGET_ARCH),IOS)
    build : $(RELEASE_APP_IOS)
  else
    build : $(RELEASE_APP_ANDROID)
  endif
  INSTALL_FLAG := --release
  #IOS_IDENTITY=iPhone Distribution: Psygraph LLC (U9Q7B85C3E)
  #IOS_IDENTITY=iPhone Distribution
  #IOS_IDENTITY=iPhone Developer: alec@psygraph.com (Q427HYAP86)
endif

# debug ==================

distiributionUrl=file://$(3P_DIR)/gradle-2.2.1-all.zip

$(DEBUG_APP_ANDROID): $(SRC_FILES) Makefile
	@echo $(SRC_FILES)
	./platforms/android/cordova/clean
	cordova build android --device --debug
	mkdir -p $(dir $@)
	$(CP) $(ANDROID_DEBUG_BUILD) $@

#IOS_IDENTITY=Psygraph LLC
#IOS_IDENTITY=iOS Distribution
#IOS_IDENTITY=iPhone Distribution: Psygraph LLC (U9Q7B85C3E)
#IOS_IDENTITY=iPhone Developer: alec@psygraph.com (Q427HYAP86)
#PROVISIONING_PROFILE=XC iOS: com.psygraph.pg
#PROVISIONING_PROFILE=iOS Team Provisioning Profile: com.psygraph.pg
#PP=67c74d57-6aa9-4ff4-b211-2f8c43774772


$(DEBUG_APP_IOS): $(SRC_FILES) Makefile
	./platforms/ios/cordova/clean
	cordova build ios --device --debug
	mkdir -p $(dir $@)
	$(CP) $(IOS_DEBUG_BUILD) $@
	#xcodebuild -project ./platforms/ios/Psygraph.xcodeproj -configuration Debug -scheme CordovaLib -exportOptionsPlist export.plist
	#xcodebuild -project ./platforms/ios/Psygraph.xcodeproj -configuration Debug -scheme Psygraph -exportOptionsPlist export.plist
	#/usr/bin/xcrun -sdk iphoneos PackageApplication -v "$(IOS_DEBUG_BUILD)" --sign "$(IOS_IDENTITY)" -o $@
# --embed "$(PROVISIONING_PROFILE)" 
# we removed this and changed the following to remove any reference to "resource-rules":
# /Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Developer/usr/bin/PackageApplication 

# release ===================

$(RELEASE_APP_ANDROID): $(SRC_FILES) $(KEYSTORE)
	./platforms/android/cordova/clean
	cordova build android --device --release
	mkdir -p $(dir $@)
	$(CP) $(ANDROID_RELEASE_BUILD) $@.unaligned
	@-rm $@
	$(SIGN_APP)
	sleep 1
	ls -l $@.unaligned
	$(ZIPALIGN) 4 $@.unaligned $@
	rm $@.unaligned

$(RELEASE_APP_IOS) : $(SRC_FILES)
	./platforms/ios/cordova/clean
	-cordova build ios --device --release
	mkdir -p $(dir $@)
	$(CP) $(IOS_DEBUG_BUILD) $@
	#xcodebuild -project ./platforms/ios/Psygraph.xcodeproj -configuration Release -scheme CordovaLib
	#xcodebuild -project ./platforms/ios/Psygraph.xcodeproj -configuration Release -scheme Psygraph
	#xcodebuild archive -project ./platforms/ios/Psygraph.xcodeproj -configuration Release -scheme Psygraph -archivePath ../derived/webclient/Psygraph.xcarchive
	#xcodebuild -exportArchive -archivePath ../derived/webclient/Psygraph.xcarchive -exportPath ../derived/webclient/Psygraph -exportFormat ipa
	#-exportProvisioningProfile “Provisioning Profile Name”
	#/usr/bin/xcrun -sdk iphoneos PackageApplication -v $(IOS_RELEASE_BUILD) --sign "$(IOS_IDENTITY)" -o $@

$(KEYSTORE):
	keytool -genkey -v -keystore $@ -alias $(ALIAS) -keyalg RSA -keysize 2048 -validity 10000

# ETC =====================
clean:
	-rm -r $(DEBUG_APP_ANDROID) $(DEBUG_APP_IOS) $(RELEASE_APP_ANDROID) $(RELEASE_APP_IOS)
	find www -name \*~ -exec rm {} \;
	-rm $(CLIENT_TS)

sync : $(CLIENT_TS)

$(CLIENT_TS): $(DEST_FILES) Makefile
	touch $@

$(CLIENT_DIR)/% : www/%
	mkdir -p $(dir $@)
	$(CP) $^ $@

install_ios:
	cordova run ios --device --nobuild $(INSTALL_FLAG)
	#ios-deploy --debug --bundle $(IOS_DEBUG_BUILD)

install_android:
	cordova run android --device --nobuild $(INSTALL_FLAG)

emulate:
	cordova emulate ios

AP := $(addprefix add_,$(ADD_PLUGINS))
add_plugins : $(AP)
$(AP):
	-cordova plugin add $(@:add_%=%)

#add_org.transistorsoft.cordova.background-geolocation : 
#	-cordova plugin add https://github.com/christocracy/cordova-plugin-background-geolocation.git


RP := $(addprefix rm_,$(RM_PLUGINS))
rm_plugins : $(RP)
$(RP):
	-cordova plugin rm $(@:rm_%=%)

addPlatforms:
	cordova platforms add ios
	cordova platforms add android

platforms:
	cordova platform remove ios
	cordova platform remove android
	$(MAKE) icon
	cordova platform add ios
	cordova platform add android
