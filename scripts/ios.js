#!/usr/bin/env node

    module.exports = function(context) {
       
       var fs = context.requireCordovaModule('fs');
       var path = context.requireCordovaModule('path');


       var platformRoot = path.join(context.opts.projectRoot, 'platforms/ios');
       var file = 'exportOptions.plist';
       //fileReplace(file);

       platformRoot = path.join(context.opts.projectRoot, 'platforms/ios/Psygraph');
       file = 'Entitlements-Release.plist';
       //fileReplace(file);
       file = 'Entitlements-Debug.plist';
       //fileReplace(file);
       file = 'Psygraph-Info.plist';
       fileReplace(file);

       function fileReplace(file) {
           var manifestFile = path.join(platformRoot, file);
           if (fs.existsSync(manifestFile)) {
               fs.readFile(manifestFile, 'utf8', function (err,data) {
                       if (err) {
                           throw new Error('Unable to find '+file+': ' + err);
                       }
                       var key = 'UIFileSharingEnabled';
                       if (data.indexOf(key) == -1) {
                           var toFind = '/<key>UIRequiresFullScreen</key>/';
                           //var toReplace = '<key>UIFileSharingEnabled</key>\n<string>YES<string/>\n' + toFind;
                           var toReplace = '<key>UIFileSharingEnabled</key>\n<true/>\n' + toFind;
                           var result = data.replace(toFind, toReplace);
                           fs.writeFile(manifestFile, result, 'utf8', function (err) {
                                   if (err) throw new Error('Unable to write into : ' + err);
                               });
                       }
                   });
           }
       }
   };
