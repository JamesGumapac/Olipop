/**
*  Date     : 30 January 2023
*  Author   : Josh Paman
* 
*  Date Modified          Modified By             Notes
*/

function customizeGlImpact(transactionRecord, standardLines, customLines, book)
{
	try {
        var accIds = []

        var accountSearch = nlapiSearchRecord("account",null,
            [
                ["type","anyof","COGS"]
            ], 
            [
                new nlobjSearchColumn("name").setSort(false), 
                new nlobjSearchColumn("displayname"), 
                new nlobjSearchColumn("type"), 
                new nlobjSearchColumn("description")
            ]
        );

        accountSearch.forEach(function(result){
            accIds.push(result.getId())
        })

		var recType = transactionRecord.getRecordType();
		var recId   = transactionRecord.getId();
        var process = {};

		nlapiLogExecution('AUDIT', 'customizeGlImpact starting', recType + ':' + recId);
		nlapiLogExecution('AUDIT', 'accIds', accIds);
        
        var lineCount = standardLines.getCount();
        // no work to complete
		if (lineCount == 0) return;  

        var createdfrom = transactionRecord.getFieldValue('createdfrom') ? transactionRecord.getFieldValue('createdfrom'): '';

        if(createdfrom == '') return

		var sorecord = nlapiLoadRecord('salesorder', createdfrom);
    
        var orderSource = sorecord.getFieldValue('custbody_fa_order_source');
        var salesChannel = sorecord.getFieldValue('class');
        var custName = sorecord.getFieldText('entity')

		nlapiLogExecution('AUDIT', 'orderSource', orderSource);
		nlapiLogExecution('AUDIT', 'salesChannel', salesChannel);

        if (salesChannel == '2' && orderSource == '3'){
            for (var i=0; i < lineCount; i++) {
			    var line =  standardLines.getLine(i);

                if ( !line.isPosting() ) continue; // not a posting item
			    if ( line.getId() == 0 ) continue; // summary lines; ignore

                var acctId = line.getAccountId()? line.getAccountId():'';
		        nlapiLogExecution('AUDIT', 'acctId', acctId);
                if(acctId != ''){
                    var debit = line.getDebitAmount() ? line.getDebitAmount(): 0
                    var credit = line.getCreditAmount() ? line.getCreditAmount(): 0
                    var location = line.getLocationId() ? line.getLocationId(): ''
                    var classLine = line.getClassId() ? line.getClassId(): ''
                    var department = line.getDepartmentId() ? line.getDepartmentId(): ''

                    process[i] = {
                        debit: parseFloat(debit),
                        credit: parseFloat(credit),
                        class: classLine,
                        location: location,
                        department: department,
                        acctId : acctId
                    }
                    
                    nlapiLogExecution('DEBUG', 'process', JSON.stringify(process));
                }
            }

			nlapiLogExecution('DEBUG', 'process', JSON.stringify(process));

            for (var x in process) {
                var accountId = process[x].acctId
                var cls = process[x].class
                var loc = process[x].location
                var dep = process[x].department
                var done = false

                if(process[x].debit == process[x].credit) continue;

                for(var iterator = 0; iterator < accIds.length; iterator++){
                    if (done) break;
                    nlapiLogExecution('DEBUG', accIds[iterator], x);

                    if(accountId == accIds[iterator]){
                        done = true
                        var debitProcess = process[x].debit
                        var creditProcess = process[x].credit
                        if( debitProcess > creditProcess){
                            var amountToCredit = parseFloat(debitProcess - creditProcess)

                            var newLine = customLines.addNewLine();
                            newLine.setAccountId(parseInt(accountId));
                            if ( cls.length != '' ) {
                                newLine.setClassId(parseInt(cls));
                            }
                            if ( loc.length != '' ) {
                                newLine.setLocationId(parseInt(loc));
                            }
                            if ( dep.length != '' ) {
                                newLine.setDepartmentId(parseInt(dep));
                            }
                            newLine.setCreditAmount((parseFloat(debitProcess)));
                            newLine.setMemo(custName + " - Reclass COGS");

                            var newLine = customLines.addNewLine();
                            newLine.setAccountId(parseInt('325'));
                            if ( cls.length != '' ) {
                                newLine.setClassId(parseInt(cls));
                            }
                            if ( loc.length != '' ) {
                                newLine.setLocationId(parseInt(loc));
                            }
                            if ( dep.length != '' ) {
                                newLine.setDepartmentId(parseInt(dep));
                            }
                            newLine.setDebitAmount((parseFloat(debitProcess)));
                            newLine.setMemo(custName + " - Reclass COGS");
                        }
                    }
                }
            }
        }

	} catch(e) {
		try {
			var err_title = 'Unexpected error';
			var err_description = '';
			if (e){
				if ( e instanceof nlobjError ){
					err_description = err_description + ' ' + e.getCode() + '|' + e.getDetails();
				} else {
					err_description = err_description + ' ' + e.toString();
				};
			};
			nlapiLogExecution('ERROR', 'Log Error ' + err_title, err_description);
		} catch(ex) {
			nlapiLogExecution('ERROR', 'Error performing error logging');
		};
	};
};