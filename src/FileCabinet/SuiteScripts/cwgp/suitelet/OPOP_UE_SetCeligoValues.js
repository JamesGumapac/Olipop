/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

 define(['N/record'], (record) => {
    
    const afterSubmit = (context) => {
        try {
            var intRecordId = context.newRecord.id;
            var strRecordType = context.newRecord.type;
            var eventType = context.type;
            
            if(eventType =='create'){
                var objTran = record.load({
                    type: strRecordType,
                    id: intRecordId,
                    isDynamic: true
                });

                var celigoTaxRate = objTran.getValue({fieldId: 'custbody_cwgp_celigotaxrate'});
                log.debug('celigoTaxRate', celigoTaxRate);
                if(celigoTaxRate){
                    objTran.setValue({fieldId: 'taxrate', value: celigoTaxRate});
                }

                var idTran = objTran.save();
                log.debug('idTran', idTran);
            }

        } catch (ex) {
            log.error('error', ex);
        }
    }
    return {       
        afterSubmit
    };
});
