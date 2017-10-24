//
//  CDVBackgroundGeolocationTests.m
//  CDVBackgroundGeolocationTests
//
//  Created by Marian Hello on 10/06/16.
//  Copyright © 2016 mauron85. All rights reserved.
//

#import <XCTest/XCTest.h>
#import "SQLiteLocationDAO.h"

@interface SQLiteLocationDAOTests : XCTestCase

@end

@implementation SQLiteLocationDAOTests

- (void)setUp {
    [super setUp];
    SQLiteLocationDAO *locationDAO = [SQLiteLocationDAO sharedInstance];
    [locationDAO clearDatabase];
}

- (void)tearDown {
    // Put teardown code here. This method is called after the invocation of each test method in the class.
    [super tearDown];
}

- (void)testPersistLocation {
    // This is an example of a functional test case.
    // Use XCTAssert and related functions to verify your tests produce the correct results.
    
    SQLiteLocationDAO *locationDAO = [SQLiteLocationDAO sharedInstance];
    Location *location = [[Location alloc] init];
    
    location.time = [NSDate dateWithTimeIntervalSince1970:1465511097774.577];
    location.accuracy = [NSNumber numberWithDouble:5];
    location.speed = [NSNumber numberWithDouble:31.67];
    location.heading = [NSNumber numberWithDouble:298.83];
    location.altitude = [NSNumber numberWithDouble:940];
    location.latitude = [NSNumber numberWithDouble:37.35439853];
    location.longitude = [NSNumber numberWithDouble:-122.1100721];
    location.provider = @"TEST";
    location.serviceProvider = [NSNumber numberWithInt:-1];
    
    [locationDAO persistLocation:location];
    
    NSArray<Location*> *locations = [locationDAO getAllLocations];
    Location *result = [locations firstObject];
    
    XCTAssertEqual([locations count], 1, @"Number of stored location is %lu expecting 1", (unsigned long)[locations count]);
    XCTAssertTrue([result.time isEqualToDate:[NSDate dateWithTimeIntervalSince1970:1465511097774.577]], "Location time is %@ expecting %@", result.time, [NSDate dateWithTimeIntervalSince1970:1465511097774.577]);
    XCTAssertTrue([result.accuracy isEqualToNumber:[NSNumber numberWithDouble:5]], "Location accuracy is %@ expecting %@", result.accuracy, [NSNumber numberWithDouble:5]);
    XCTAssertTrue([result.speed isEqualToNumber:[NSNumber numberWithDouble:31.67]], "Location speed is %@ expecting %@", result.speed, [NSNumber numberWithDouble:31.67]);
    XCTAssertTrue([result.heading isEqualToNumber:[NSNumber numberWithDouble:298.83]], "Location heading is %@ expecting %@", result.heading, [NSNumber numberWithDouble:298.83]);
    XCTAssertTrue([result.altitude isEqualToNumber:[NSNumber numberWithDouble:940]], "Location altitude is %@ expecting %@", result.altitude, [NSNumber numberWithDouble:940]);
    XCTAssertTrue([result.latitude isEqualToNumber:[NSNumber numberWithDouble:37.35439853]], "Location latitude is %@ expecting %@", result.latitude, [NSNumber numberWithDouble:37.35439853]);
    XCTAssertTrue([result.longitude isEqualToNumber:[NSNumber numberWithDouble:-122.1100721]], "Location longitude is %@ expecting %@", result.longitude, [NSNumber numberWithDouble:-122.1100721]);
    XCTAssertTrue([result.provider isEqualToString:@"TEST"], @"Location provider is expected to be TEST");
    XCTAssertTrue([result.serviceProvider isEqualToNumber:[NSNumber numberWithInt:-1]], "Location service_provider is %@ expecting %@", result.serviceProvider, [NSNumber numberWithInt:-1]);
}


- (void)testDeleteLocation {
    SQLiteLocationDAO *locationDAO = [SQLiteLocationDAO sharedInstance];
    Location *location = [[Location alloc] init];
    
    location.time = [NSDate dateWithTimeIntervalSince1970:1465511097774.577];
    location.accuracy = [NSNumber numberWithDouble:5];
    location.speed = [NSNumber numberWithDouble:31.67];
    location.heading = [NSNumber numberWithDouble:298.83];
    location.altitude = [NSNumber numberWithDouble:940];
    location.latitude = [NSNumber numberWithDouble:37.35439853];
    location.longitude = [NSNumber numberWithDouble:-122.1100721];
    location.provider = @"TEST";
    location.serviceProvider = [NSNumber numberWithInt:-1];
    
    NSNumber *locationId1 = [locationDAO persistLocation:location];
    NSNumber *locationId2 = [locationDAO persistLocation:location];
    
    NSArray<Location*> *locations = [locationDAO getAllLocations];
    XCTAssertEqual([locations count], 2, @"Number of stored location is %lu expecting 2", (unsigned long)[locations count]);
    
    [locationDAO deleteLocation:locationId1];
    locations = [locationDAO getValidLocations];
    Location *result = [locations firstObject];

    XCTAssertEqual([locations count], 1, @"Number of stored location is %lu expecting 1", (unsigned long)[locations count]);
    XCTAssertTrue([result.id isEqualToNumber:locationId2], "LocationId is %@ expecting %@", result.id, locationId2);
}

- (void)testDeleteAllLocations {
    SQLiteLocationDAO *locationDAO = [SQLiteLocationDAO sharedInstance];
    Location *location = [[Location alloc] init];
    
    location.time = [NSDate dateWithTimeIntervalSince1970:1465511097774.577];
    location.accuracy = [NSNumber numberWithDouble:5];
    location.speed = [NSNumber numberWithDouble:31.67];
    location.heading = [NSNumber numberWithDouble:298.83];
    location.altitude = [NSNumber numberWithDouble:940];
    location.latitude = [NSNumber numberWithDouble:37.35439853];
    location.longitude = [NSNumber numberWithDouble:-122.1100721];
    location.provider = @"TEST";
    location.serviceProvider = [NSNumber numberWithInt:-1];
    
    [locationDAO persistLocation:location];
    [locationDAO persistLocation:location];
    [locationDAO persistLocation:location];
    [locationDAO persistLocation:location];
    [locationDAO persistLocation:location];
    [locationDAO persistLocation:location];
    [locationDAO persistLocation:location];
    
    NSArray<Location*> *locations = [locationDAO getAllLocations];
    XCTAssertEqual([locations count], 7, @"Number of stored location is %lu expecting 7", (unsigned long)[locations count]);
    
    [locationDAO deleteAllLocations];
    locations = [locationDAO getValidLocations];
    
    XCTAssertEqual([locations count], 0, @"Number of stored location is %lu expecting 0", (unsigned long)[locations count]);
}

- (void)testGetAllLocations {
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
    
    NSArray<Location*> *locations = [locationDAO getAllLocations];
    XCTAssertEqual([locations count], 10, @"Number of stored location is %lu expecting 10", (unsigned long)[locations count]);

    for (int i = 0; i < 10; i++) {
        Location *result = [locations objectAtIndex:i];
        XCTAssertEqual([result.id intValue], i+1, "LocationId is %d expecting %d", [result.id intValue], i+1);
        XCTAssertTrue([result.time isEqualToDate:[NSDate dateWithTimeIntervalSince1970:1465511097774.577+i]], "Location time is %@ expecting %@", result.time, [NSDate dateWithTimeIntervalSince1970:1465511097774.577+i]);
        XCTAssertTrue([result.accuracy isEqualToNumber:[NSNumber numberWithDouble:5+i]], "Location accuracy is %@ expecting %@", result.accuracy, [NSNumber numberWithDouble:5+i]);
        XCTAssertTrue([result.speed isEqualToNumber:[NSNumber numberWithDouble:31.67+i]], "Location speed is %@ expecting %@", result.speed, [NSNumber numberWithDouble:31.67+i]);
        XCTAssertTrue([result.heading isEqualToNumber:[NSNumber numberWithDouble:298.83+i]], "Location heading is %@ expecting %@", result.heading, [NSNumber numberWithDouble:298.83+i]);
        XCTAssertTrue([result.altitude isEqualToNumber:[NSNumber numberWithDouble:940+i]], "Location altitude is %@ expecting %@", result.altitude, [NSNumber numberWithDouble:940+i]);
        XCTAssertTrue([result.latitude isEqualToNumber:[NSNumber numberWithDouble:37.35439853+i]], "Location latitude is %@ expecting %@", result.latitude, [NSNumber numberWithDouble:37.35439853+i]);
        XCTAssertTrue([result.longitude isEqualToNumber:[NSNumber numberWithDouble:-122.1100721+i]], "Location longitude is %@ expecting %@", result.longitude, [NSNumber numberWithDouble:-122.1100721+i]);
        XCTAssertTrue([result.provider isEqualToString:@"TEST"], @"Location provider is expected to be TEST");
        XCTAssertTrue([result.serviceProvider isEqualToNumber:[NSNumber numberWithInt:-1]], "Location service_provider is %@ expecting %@", result.serviceProvider, [NSNumber numberWithInt:-1]);
    }
}

- (void)testGetValidLocations {
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
        location.isValid = (i % 2) == 0;
        
        [locationDAO persistLocation:location];
    }
    
    NSArray<Location*> *validLocations = [locationDAO getValidLocations];
    XCTAssertEqual([validLocations count], 5, @"Number of valid location is %lu expecting 5", (unsigned long)[validLocations count]);

    NSArray<Location*> *locations = [locationDAO getAllLocations];
    XCTAssertEqual([locations count], 10, @"Number of stored location is %lu expecting 10", (unsigned long)[locations count]);

    for (int i = 0; i < 10; i++) {
        Location *result = [locations objectAtIndex:i];
        if ((i % 2) == 0) {
            XCTAssertTrue(result.isValid);
        } else {
            XCTAssertFalse(result.isValid);
        }
    }
}


- (void)testPersistLocationWithRowLimit {
    int maxRows = 100;
    SQLiteLocationDAO *locationDAO = [SQLiteLocationDAO sharedInstance];
    Location *location;
    
    for (int i = 0; i < maxRows * 2; i++) {
        [locationDAO persistLocation:nil limitRows:maxRows];
    }
    
    NSArray<Location*> *locations = [locationDAO getAllLocations];
    XCTAssertEqual([locations count], maxRows, @"Number of stored location is %lu expecting 2000", (unsigned long)[locations count]);
}

- (void)testPersistLocationWithRowLimitWhenMaxRowsReduced {
    NSInteger maxRowsRun[2] = {100, 10};
    SQLiteLocationDAO *locationDAO = [SQLiteLocationDAO sharedInstance];
    
    for (int i = 0; i < sizeof(maxRowsRun) / sizeof(NSInteger); i++) {
        NSInteger maxRows = maxRowsRun[i];
        for (int i = 0; i < maxRows * 2; i++) {
            [locationDAO persistLocation:nil limitRows:maxRows];
        }
        NSArray<Location*> *locations = [locationDAO getAllLocations];
        XCTAssertEqual([locations count], maxRows, @"Number of stored location is %lu expecting %ld", (unsigned long)[locations count], (long)maxRows);
    }
    
    NSNumber *locationId = [locationDAO persistLocation:nil];
    XCTAssertTrue([locationId isEqualToNumber:[NSNumber numberWithInt:101]], @"Expecting primary key id to be 101 actual %@", locationId);
}

@end
