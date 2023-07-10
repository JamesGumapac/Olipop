/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * 
 * Created by: Jared Espineli
 * Date Created: June 7, 2023
 */

define(['N/record'], (record) => {    
    const beforeLoad = (context) => {
        try {

        } catch (ex) {
            log.error('error', ex);
        }
    }
    const beforeSubmit = (context) => {
        try {
            /*var objIF = context.newRecord;
            var itemCount = objIF.getLineCount({sublistId: 'item'});
            var trackNumcount = objIF.getLineCount({sublistId: 'package'});
            var arrTrackNum = [];
            log.debug('itemCount | trackNumcount', [itemCount, trackNumcount]);

            for(var trackLine=0; trackLine<trackNumcount; trackLine++){
                var strTrackNum = objIF.getSublistValue({sublistId: 'package', fieldId: 'packagetrackingnumber', line: trackLine});
                var objTrackNum = {
                    'trackNum': strTrackNum,
                    'status': 'free',
                    'unitCount': '0'
                }
                arrTrackNum.push(objTrackNum)
            }
            log.debug('arrTrackNum', arrTrackNum);

            var unitCount = 0;
            var tempCount = 0;
            //custcol_cwgp_trackingnum
            for(var itemLine=0; itemLine<itemCount; itemLine++){                
                var strUnit = objIF.getSublistValue({sublistId: 'item', fieldId: 'unitsdisplay', line: itemLine});
                strUnit = strUnit.replace(/[^0-9]/g,' ');    //retrieve only the numerical value in the units
                strUnit = strUnit.replace(/\s+$/, '');       //remove all white spaces after the last string character
                log.debug('strUnit', strUnit);   
                
                let obj = arrTrackNum.find(x => x.status === 'free');
                let index = arrTrackNum.indexOf(obj);

                if(strUnit.includes(' ')){
                    unitCount = 0;                    
                    log.debug('index 2', index);
                    objIF.setSublistValue({sublistId: 'item', fieldId: 'custcol_cwgp_trackingnum', line: itemLine, value: arrTrackNum[index].trackNum});
                    arrTrackNum.splice(index, 1);
                    log.debug('w/ space arrTrackNum', arrTrackNum)
                }else{
                    unitCount += Number(strUnit);
                    if(unitCount <= 24){    
                        tempCount += unitCount;                 
                        objIF.setSublistValue({sublistId: 'item', fieldId: 'custcol_cwgp_trackingnum', line: itemLine, value: arrTrackNum[0].trackNum});   
                        arrTrackNum[0].status = 'taken';                                  
                        log.debug('w/o space arrTrackNum 1', arrTrackNum);   
                        if(tempCount == 24) arrTrackNum.splice(0, 1);
                    }else{                        
                        log.debug('index 2', index);
                        objIF.setSublistValue({sublistId: 'item', fieldId: 'custcol_cwgp_trackingnum', line: itemLine, value: arrTrackNum[index].trackNum});                                                
                        arrTrackNum[index].status = 'taken';
                        arrTrackNum.splice(index, 1);
                        log.debug('w/o space arrTrackNum 2', arrTrackNum);
                    }
                }

                log.debug('unitCount', unitCount);
            }*/
        } catch (ex) {
            log.error('error', ex);
        }
    }
    const afterSubmit = (context) => {
        try {
            var intRecordId = context.newRecord.id;
            var strRecordType = context.newRecord.type;
            var eventType      = context.type;                        

            var objIF = record.load({type: strRecordType, id: intRecordId});
            var itemCount = objIF.getLineCount({sublistId: 'item'});
            var trackNumcount = objIF.getLineCount({sublistId: 'package'});
            var arrTrackNum = [];            

            for(var trackLine=0; trackLine<trackNumcount; trackLine++){
                var strTrackNum = objIF.getSublistValue({sublistId: 'package', fieldId: 'packagetrackingnumber', line: trackLine});
                var objTrackNum = {
                    'trackNum': strTrackNum,
                    'status': 'free',
                    'unitCount': '0'
                }
                arrTrackNum.push(objTrackNum)
            }
            log.debug('arrTrackNum', arrTrackNum);

            var unitCount = 0;
            var tempCount = 0;
            //custcol_cwgp_trackingnum
            for(var itemLine=0; itemLine<itemCount; itemLine++){                
                var strUnit = objIF.getSublistValue({sublistId: 'item', fieldId: 'unitsdisplay', line: itemLine});
                var itemQty = objIF.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: itemLine});
                strUnit = strUnit.replace(/[^0-9]/g,' ');    //retrieve only the numerical value in the units
                strUnit = strUnit.replace(/\s+$/, '');       //remove all white spaces after the last string character
                log.debug('strUnit', strUnit);   
                
                var obj = arrTrackNum.find(x => x.status === 'free');
                var index = arrTrackNum.indexOf(obj);
                unitCount += Number(strUnit*itemQty)
                if(unitCount <= 24){
                    log.debug('test 1')
                    log.debug('unitCount 1', unitCount)
                    objIF.setSublistValue({sublistId: 'item', fieldId: 'custcol_cwgp_trackingnum', line: itemLine, value: arrTrackNum[0].trackNum});   
                    arrTrackNum[0].status = 'taken';
                    log.debug('arrTrackNum check 1', arrTrackNum)
                    if(unitCount == 24){
                        arrTrackNum.splice(0, 1);
                        unitCount = 0;
                        log.debug('arrTrackNum check 2', arrTrackNum)
                    }
                }else{
                    log.debug('test 2')
                    log.debug('unitCount 2', unitCount)
                    objIF.setSublistValue({sublistId: 'item', fieldId: 'custcol_cwgp_trackingnum', line: itemLine, value: arrTrackNum[index].trackNum});   
                    
                    if(unitCount > 24) unitCount -= Number(strUnit*itemQty)
                    
                    arrTrackNum.splice(index, 1);
                    log.debug('arrTrackNum check 3', arrTrackNum)
                }             
            }

            objIF.save();
        } catch (ex) {
            log.error('error', ex);
        }
    }
    return {
        beforeLoad,
        beforeSubmit,
        afterSubmit
    };
});
