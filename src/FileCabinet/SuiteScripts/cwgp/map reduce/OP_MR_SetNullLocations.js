/**
 * Author: Marc Aliswag
 * Date: 2022-01-10
 *
 * Date         Modified By            Notes
 * 2022-01-10   Marc Aliswag           Initial File Creation
 * 2023-07-04   Carl Sy                Added condition to check if ALL line level location of Sales Order is null
 
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * 
 * Modifications:
 */

define(['N/search', 'N/record','N/runtime'],

function(search, record, runtime) {

    const _CONFIG = {
        SEARCHID: 'customsearch_cwgp_script_backorderloc',
        ITEMS: [5159, 5158, 5160, 5164, 5174, 5205],
        //ITEMS : [2952, 2950, 2954, 2960, 2968, 3475],
        SEARCHES :{
            WITHLOCATION : 2390,
            WITHOUTLOCATION : 2391
        }
    }

    function getInputData() { 

        var script = runtime.getCurrentScript();
        var searchId = script.getParameter({
            name: 'custscript_cwgp_savedsearch'
        }); 

        log.debug("searchId", searchId)
        try {
            //let objSearch = searchOrders(_CONFIG.SEARCHID);
            let objSearch = searchOrders(searchId);
            let arrIds = Object.keys(objSearch);
            log.debug("arrIds",arrIds);
            arrIds.forEach(function (id) {
                let arrLines = Object.keys(objSearch[id]);
                let arrLocation = [];
                log.debug("arrLines",arrLines);
                arrLines.forEach(function (line) {
                    if(arrLines.length <= 0) {
                        delete objSearch[id];
                    } else if (arrLines.length > 0) {
                        arrLocation.push(objSearch[id][line].location);
                    } 
                });

            });

            log.debug('objSearch', objSearch);
            return objSearch;
        } catch (error) {
            log.error('Unexpected Error on Get Input Data', error.message);
        }
    }

    function map(context) {

        var script = runtime.getCurrentScript();
        var searchId = script.getParameter({
            name: 'custscript_cwgp_savedsearch'
        }); 


        try {
            log.debug('context values', JSON.parse(context.value));

            let intId = context.key;
            let objValues = JSON.parse(context.value);
            var arrSOItems = [];
            let arrLines = Object.keys(objValues);
            let arrNullLines = [], intLocation;
            var arrSOItems = [];
            var hasALAItem = false;
            arrLines.forEach(function (line) {

                if(objValues[line].location == null) {
                    arrNullLines.push(line);
                    arrSOItems.push(objValues[line].item);
                }
                if(objValues[line].location != null) {
                    intLocation = objValues[line].location;
                }
            });
            //log.debug("intLocation",intLocation);
            //Begin : Adding of function to find nearest location the item is available based on the selected ALA Config Rule
            log.debug("intLocation 1", intLocation);
            if(isEmpty(intLocation)){
                log.debug("searchId", searchId);
                if(searchId == _CONFIG.SEARCHES.WITHLOCATION){
                    intLocation = fnSearchIfRecordHasLocation(intId);
                }
                else{
                    var arrLocations = fnALAReassignToLocation(intId);
                    log.debug("arrLocations",arrLocations);
                    intLocation = fnCheckLocations(arrLocations, arrSOItems);
                    log.debug("intLocation",intLocation);
                }
            }

            if(arrNullLines.length >= 1 && !isEmpty(intLocation)) {
                let intSalesOrderId = setNullLocations(intId, arrNullLines, intLocation);
                log.debug('intSalesOrderId', intSalesOrderId);
            }
        } catch (error) {
            log.error('Unexpected Error on Map', error.message);
        }
    }

    return {
        getInputData: getInputData,
        map: map
    };

    function searchOrders(searchid) {
        let objHolder = {};
        let ssLocationSearch = search.load({ id: searchid });

        ssLocationSearch.run().each(function (result) {
            log.debug("result", result);
          // Added condition to check if ALL line level location of Sales Order is null
            if(searchid == _CONFIG.SEARCHES.WITHOUTLOCATION){
                let objSalesOrder = record.load({
                    type: record.Type.SALES_ORDER,
                    id: result.id,
                    isDynamic: true
                });
    
                let itemSLCount = objSalesOrder.getLineCount({
                    sublistId: 'item'
                });
                
                log.debug('itemSLCount', itemSLCount);
    
                for(var i = 0; i < itemSLCount; i++){ //Check all lines for location
                    let itemLocation = objSalesOrder.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        line: i
                    });
                    if (itemLocation){
                        log.debug('searchOrders_checkIfHasLocation', 'Sales Order has line item location');
                        return true;
                    }
                }
            }
            let line = parseInt(result.getValue({ name: 'linesequencenumber' })) - 1;

            if(objHolder[result.id]) {
                objHolder[result.id][line] = {
                    'location': result.getValue({ name: 'location' }) || null,
                    'item': result.getValue({ name: 'item' }) || null
                }
            } else {
                objHolder[result.id] = {
                    [line]: {
                        'location': result.getValue({ name: 'location' }) || null,
                        'item': result.getValue({ name: 'item' }) || null
                    }
                }
            }

            return true;
        })
        log.debug("objHolder", objHolder);
        return objHolder;
    }

    function setNullLocations(id, arrLines, location) {
        if(isEmpty(location)){
            location = null;
        }

        let objRecord = record.load({
            type: record.Type.SALES_ORDER,
            id: id,
            isDynamic: true
        });

        var soLineCount = objRecord.getLineCount({sublistId : "item"});

        for(var c=0; c<soLineCount;c++){
            objRecord.selectLine({sublistId : "item", line: c});

            try{
                objRecord.setCurrentSublistValue({sublistId : "item", fieldId : "location", value : location});
                objRecord.commitLine({sublistId : "item"});
            }catch(e){
            }
        }
       /* arrLines.forEach(function (line) {
            objRecord.setSublistValue({
                sublistId: 'item',
                fieldId: 'location',
                line: line,
                value: location
            })
        });*/

        let soId = objRecord.save();

        return soId;
    }


    function fnSearchIfRecordHasLocation(soId){
        var location;
        let objRecord = record.load({
            type: record.Type.SALES_ORDER,
            id: soId
        });

        var soLineCount = objRecord.getLineCount({sublistId : "item"});

        for(var c=0;c<soLineCount;c++){
            var locationId = objRecord.getSublistValue({sublistId : "item", fieldId : "location", line: c});

            if(!isEmpty(locationId)){
                location = locationId
            }
        }

        return location;

    }

    function isEmpty(value) {

        if (value == null || value == 'null' || value == undefined
            || value == 'undefined' || value == '' || value == ""
            || value.length <= 0) {
            return true;
        }
        return false;
    }


    function fnALAReassignToLocation(soID){
        log.debug("fnALAReassignToLocation",fnALAReassignToLocation);
        let objSoRecord = record.load({
            type: record.Type.SALES_ORDER,
            id: soID
        });

        var soZipCode = objSoRecord.getValue("shipzip").replace("-","");
        var alaConfig = objSoRecord.getValue("alaconfiguration");
        var locations = srchRuleLocations(alaConfig, soZipCode);
        log.debug("locations",locations);

        return locations;
    }


    function srchRuleLocations(alaConfig, soZipCode){
        var locations = [];
        
        var customrecord_cwgp_ala_rulesSearchObj = search.create({
            type: "customrecord_cwgp_ala_rules",
            filters:
            [
               ["custrecord_cwgp_ala_config","anyof",alaConfig]
            ],
            columns:
            [
                search.createColumn({name: "scriptid", label: "Script ID"}),
                search.createColumn({name: "custrecord_cwgp_ala_config", label: "ALA Config"}),
                search.createColumn({name: "custrecord_cwgp_ala_rule", label: "ALA Rule"}),
                search.createColumn({
                   name: "internalid",
                   join: "CUSTRECORD_CWGP_ALA_LOCATIONS",
                   label: "Internal ID"
                }),
                search.createColumn({
                   name: "zip",
                   join: "CUSTRECORD_CWGP_ALA_LOCATIONS",
                   sort: search.Sort.ASC,
                   label: "Zip"
                })
            ]
         });
         var columns = customrecord_cwgp_ala_rulesSearchObj.columns;
         customrecord_cwgp_ala_rulesSearchObj.run().each(function(result){

            var locationId = result.getValue(columns[3]);
            var zipDifference = Math.abs(parseInt(soZipCode) - parseInt(result.getValue(columns[4])));

            var objLocation = {
                "location" : locationId,
                "difference" : zipDifference
            }
            locations.push(objLocation);

            return true;
         });

         var arrLocations;
         if(locations.length > 1){
            arrLocations = fnSortNearestLocation(locations);
         }else{
            arrLocations = locations;
         }

         return arrLocations;
    }


    function fnCheckLocations(arrLocations, arrSOItems){
        var intLocation; 
            /*for(var i=0; i< arrLocations.length; i++){
                var locationId = arrLocations[i].location;
                var intAvailableLocation = fnFindAvailableLocation(locationId, arrSOItems);

                if(!isEmpty(intAvailableLocation)){
                    intLocation = intAvailableLocation;
                    break;
                }
            }*/
            try{
                intLocation = arrLocations[0].location
            }catch(e){

            }
            

        return intLocation;

    }


    function fnSortNearestLocation(arrLocations){

        var sortedLocations = arrLocations.sort((a, b) => {
            return a.difference - b.difference;
        }).reverse();

        return sortedLocations;
    }

    function fnFindAvailableLocation(itemid,locationid){
        var intLocationId;
        var inventorynumberSearchObj = search.create({
            type: "inventorynumber",
            filters:
            [
               ["item","anyof",itemid], 
               "AND", 
               ["location","anyof",locationid], 
               "AND", 
               ["quantityavailable","greaterthan","0"]
            ],
            columns:
            [
               search.createColumn({
                  name: "location",
                  summary: "GROUP",
                  label: "Location"
               }),
               search.createColumn({
                  name: "location",
                  summary: "COUNT",
                  label: "Location"
               })
            ]
         });
         var columns = inventorynumberSearchObj.columns;
         inventorynumberSearchObj.run().each(function(result){
            log.debug("Results Grouped", result);
            intLocationId = result.getValue(columns[0]);
            return true;
         });

         return intLocationId;
    }

});