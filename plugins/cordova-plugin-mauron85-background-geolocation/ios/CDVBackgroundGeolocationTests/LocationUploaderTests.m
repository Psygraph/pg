//
//  LocationUploaderTests.m
//  CDVBackgroundGeolocation
//
//  Created by Marian Hello on 07/07/16.
//  Copyright © 2016 mauron85. All rights reserved.
//

#import <XCTest/XCTest.h>
#import "LocationUploader.h"
#import "SQLiteLocationDAO.h"

@interface LocationUploaderTests : XCTestCase

@end

@implementation LocationUploaderTests

- (void)setUp {
    [super setUp];
    SQLiteLocationDAO *locationDAO = [SQLiteLocationDAO sharedInstance];
    [locationDAO clearDatabase];
}

- (void)tearDown {
    // Put teardown code here. This method is called after the invocation of each test method in the class.
    [super tearDown];
}

- (void)testSync {
    SQLiteLocationDAO *locationDAO = [SQLiteLocationDAO sharedInstance];
    Location *location;
    
    for (int i = 0; i < 10; i++) {
        location = [[Location alloc] init];
        location.time = [NSDate dateWithTimeIntervalSince1970:1465511097774.577+i];
        location.accuracy = [NSNumber numberWithDouble:5+i];
        location.speed = [NSNumber numberWithDouble:31.67+i];
        location.heading = [NSNumber numberWithDouble:298.83+i];
        location.altitude = [NSNumber numberWithDouble:940+i];
        location.latitude = [NSNumber numberWithDouble:37.35439853+i];
        location.longitude = [NSNumber numberWithDouble:-122.1100721+i];
        location.provider = @"TEST";
        location.serviceProvider = [NSNumber numberWithInt:-1];
        
        [locationDAO persistLocation:location];
    }
    
    LocationUploader *uploader = [[LocationUploader alloc] init];
    [uploader sync:@"http://192.168.81.15:3000/testSync" onLocationThreshold:10];
    sleep(5);
    
}

@end
