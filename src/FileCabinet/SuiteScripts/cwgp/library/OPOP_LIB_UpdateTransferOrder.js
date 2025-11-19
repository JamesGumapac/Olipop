/**
* OPOP_LIB_UpdateTransferOrder.js
* @NApiVersion 2.x
* @NModuleScope Public
* Date : February 28, 2023
*
* Modifications:
* 	1.00		rmolina
*
*/

var dependencies = ['N/search'];

define(dependencies,function(search){
	var SCRIPT_PARAMETERS = {
			HTML_FILE_ID: 'custscript_cwgp_opop_html_fileid',
			CLIENTSCRIPT: 'custscript_cwgp_clientscriptpath',
			ACTION: 'custscript_cwgp_action',
			DEFAULT_TEMPLATE: '116',
			//PDF Files folder
			DEFAULT_FOLDER: '86892',
			// 86892 PROD
			// 16842 SB
						  
		};
	
	var SAVED_SEARCH = {
			TotalRequests: {
				ID: 'customsearch_cwgp_search_transferorder',
				Filters: { 
				}
			},
			FORMULA : {
				ID: 'formulatext',
		        FORMULA: "Substr ((REGEXP_REPLACE(REGEXP_SUBSTR({item},': [^:]+*$'),': ','')), 1, 4)",
		         
			},
			TransferOrderDetails : 'customsearch_cwgp_search_todetails'
		};
	
	var TRANSFER_ORDER = {
			ID: 'transferorder',
			FIELDS: {
				ID: 'internalid',
				SUBSIDIARY: 'subsidiary',
				TYPE: 'custbody_olipop_to_type',
				ORDERNUM : 'tranid',
				TRANDATE: 'trandate',
				ROUTES:	'custbody_olipop_routes',
				FROMLOCATION: 'location',
				TOLOCATION: 'transferlocation',
				PICKUPDATE: 'custbody_olipop_exp_pickup_date',
				DELIVERYDATE: 'custbody_olipop_exp_delivery_date',
				FIRMED: 'firmed',
				USEITEMCOST: 'istransferpricecosting',
				CREATEDDATE: 'custbody_esc_created_date',//
				LASTMODIFIED: 'custbody_esc_last_modified_date', //
				POCOUNT: 'custbody_olipop_customer_po_num',
				ORDERCOUNT: 'custbody_olipop_to_casecount_number',
				MFG: 'custbody_olipop_mfg_po',
				SHIPWEIGHT: 'custbody_olipop_total_weight',
				QUANTITY: 'custbody_ns_acs_olipop_total_quantity',
				SHIPTEMP: 'custbody_olipop_ship_temp',
				STORAGETEMP: 'custbody_olipop_storage_temp',
				PRIORITYLOAD: 'custbody_cwgp_priorityload',
				CARRIER: 'custbody_cwgp_carrier',
				PALLETS: 'custbody_olipop_ttl_pallets',
				DIMENSION: 'custbody_olipop_dims',
				STATUS: 'custbody_cwgp_deliverystatus',
				LOADID: 'custbody_cwgp_loadid',
				NOTES: 'custbody_olipop_notes',
				MEMO: 'custbody_cwgp_notesto',
				CONFIRMATION: 'custbody_cwgp_confirmation'
			},
			SUBLISTS: {
				ID: 'item',
				FIELDS: {
					LINE : 'line',
					SHORT_CODE: 'custitemcustom_short_code',
					SALESDESCRIPTION: 'salesdescription',
					ITEM: 'item',
					SHOPIFY: 'custcol_custitem_fa_shopify_sku',
					QTY: 'quantity',
					AMOUNT: 'amount',
					UNITS: 'unit',
					RATE: 'rate',
					DESCRIPTION: 'salesdescription',
					MFG: 'custcol_olipop_mfgpo_line',
					ITEMWEIGHT: 'custcol_atlas_item_weight',
					TOTALWEIGHT: 'custcol_olipop_transfer_item_weight',
					PALLETS: 'custcol_olipop_estimated_pallet',
					NOTES: 'custcol_sps_spe_noteinformationfield',
					SHORTSKU: 'custcol_olipop_short_sku',
					CONFIRMATION : 'custbody_cwgp_confirmation'
				}
			}
	}
	
	var FORM_ELEMENTS = {
			HtmlField: {
				ID: 'custpage_cwgp_opop_fld_html',
				TYPE: 'INLINEHTML',
				LABEL: 'HTML Field',
				CONTAINER : 'Message'
			},
			HtmlCssField: {
				ID: 'custpage_cwgp_opop_fld_landinghtml',
				TYPE: 'INLINEHTML',
				LABEL: 'HTML Field',
				CONTAINER: 'HeaderLogo'
			},
			HtmlHeaderField: {
				ID: 'custpage_cwgp_opop_fld_headerhtml',
				TYPE: 'INLINEHTML',
				LABEL: 'Header',
				CONTAINER : 'HeaderLogo'
			},
			SubmitButtonTop: {
				ID: 'custpage_cwgp_opop_btntop'
			},
			FilterButton: {
				ID: 'custpage_cwgp_opop_fltrbtntop'
			},
			BackButton: {
				ID: 'custpage_cwgp_opop_btnback'
			},
			
			LOGIN_MENU: {
				MsgField: {
					ID: 'custpage_cwgp_opop_fld_msg_html',
					TYPE: 'INLINEHTML',
					LABEL: 'HTML Field',
					CONTAINER: 'Message'
				},
				EmployeeId: {
					ID: 'custpage_cwgp_opop_fld_empid',
					TYPE: 'TEXT',
					LABEL: 'Employee ID',
					// CONTAINER: 'Message',
					MANDATORY: true
				},
			},
			REVIEW_MENU: {
				TransferOrderList: {
					ID: 'custpage_cwgp_opop_list',
					TYPE: 'LIST',
					LABEL: 'Transfer Order'
				}
			},
			FIELD_GROUPS: {
				PrimaryInformation: {
					ID: 'custpage_cwgp_opop_priminfo_grp',
					LABEL: 'Primary Information',
				},
				AdditionalInformation: {
					ID: 'custpage_cwgp_opop_classification_grp',
					LABEL: 'Additional Information',
				},
				Main: {
					ID: 'custpage_cwgp_opop_transferorder_grp',
					LABEL: 'Transfer Order ID',
				},
				Filters: {
					ID: 'custpage_cwgp_opop_filter_grp',
					LABEL: 'Filters',
				}
			},
			FILTERS: {
				FromLocation : {
					LABEL	:	'From Location',
					ID		:	'custpage_cwgp_opop_frlocation',
					TYPE	:	'MULTISELECT', //From Location
					SOURCE	:	'location'
				},
				ToLocation : {
					LABEL	:	'To Location',
					ID		:	'custpage_cwgp_opop_tolocation',
					TYPE	:	'MULTISELECT', //To Location
					SOURCE	:	'location'
				},
				PriorityLoad: {
					ID: 'custpage_cwgp_opop_priorityload',
					TYPE: 'SELECT',
					LABEL: 'Priority Load',
					SOURCE: 'customlist_cwgp_list_priorityload'
				},
				Status: {
					ID: 'custpage_cwgp_opop_status',
					TYPE: 'SELECT',
					LABEL: 'Delivery Status',
					SOURCE: 'customlist_cwgp_list_deliverystatus'
				},
				TransferOrderID: {
					ID: 'custpage_cwgp_opop_toid',
					LABEL: 'Transfer Order ID',
					TYPE: 'TEXT'
				},
				LoadID: {
					ID: 'custpage_cwgp_opop_loadid',
					TYPE: 'TEXT',
					LABEL: 'Load ID'
				},
				Page: {
					ID: 'custpage_cwgp_opop_page',
					TYPE: 'SELECT',
					LABEL: 'Page',
					//SOURCE: ''
				}
			},
			SUBLIST : {
				ITEM : {
					ID: 'item',
					LABEL: 'Item'
				},
				NAME : {
					ID: 'custpage_cwgp_opop_sfld_t_itemname',
					LABEL: 'Item',
					TYPE: 'TEXT',
					SOURCE: 'ITEM'
				},
				SKU : {
					ID: 'custpage_cwgp_opop_sfld_t_sku',
					LABEL: 'Shopify SKU',
					TYPE: 'TEXT'
				},
				QUANTITY: {
					ID: 'custpage_cwgp_opop_sfld_t_qty',
					LABEL: 'Quantity',
					TYPE: 'INTEGER'
				},
				TRANSFERPRICE: {
					ID: 'custpage_cwgp_opop_sfld_t_transferprice',
					LABEL: 'Transfer Price',
					TYPE: 'FLOAT'
				},
				UOM: {
					ID: 'custpage_cwgp_opop_sfld_t_uom',
					LABEL: 'UOM',
					TYPE: 'TEXT',
					SOURCE: 'UNITSTYPE'
				},
				AMOUNT: {
					ID: 'custpage_cwgp_opop_sfld_t_amt',
					LABEL: 'Amount',
					TYPE: 'FLOAT'
				},
				DESCRIPTION: {
					ID: 'custpage_cwgp_opop_sfld_t_desc',
					LABEL: 'Description',
					TYPE: 'TEXT'
				},
				MFGPO: {
					ID: 'custpage_cwgp_opop_sfld_t_mfgpo',
					LABEL: 'MFG PO#',
					TYPE: 'TEXT'
				},
				ITEMWEIGHT: {
					ID: 'custpage_cwgp_opop_sfld_t_weight',
					LABEL: 'Item Weight',
					TYPE: 'TEXT'
				},
				TOTALWEIGHT: {
					ID: 'custpage_cwgp_opop_sfld_t_totalweight',
					LABEL: 'Total Item Weight',
					TYPE: 'TEXT'
				},
				ESTIMATED: {
					ID: 'custpage_cwgp_opop_sfld_t_estimated',
					LABEL: 'Estimated Pallets',
					TYPE: 'TEXT'
				},
				DIMS: {
					ID: 'custpage_cwgp_opop_sfld_t_dims',
					LABEL: 'Pallet Dims',
					TYPE: 'TEXT',
					SOURCE: 'customlist_pallet_dims'
				},
				SPECIALINSTRUCTIONS: {
					ID: 'custpage_cwgp_opop_sfld_t_specialinstructions',
					LABEL: 'Special Instructions',
					TYPE: 'TEXT'
				},
				SHORTSKU: {
					ID: 'custpage_cwgp_opop_sfld_t_shortsku',
					LABEL: 'Short SKU',
					TYPE: 'TEXT'
				},

			},
			MAIN_HEADERS: {
						PrintBtn: {
							ID: 'custpage_cwgp_opop_sfld_t_print',
							LABEL: 'Bulk Print',
							LINK_TEXT: 'Bulk Print'
						},
						TransferOrderID: {
							ID: 'custpage_cwgp_opop_sfld_t_toid',
							LABEL: 'Transfer Order ID',
							TYPE: 'TEXT'
						},
						EmployeeID: {
							ID: 'custpage_cwgp_opop_sfld_t_employeeid',
							LABEL: 'Employee ID',
							TYPE: 'TEXT'
						},
						ChkBox: {
							ID: 'custpage_cwgp_opop_sfld_t_mark',
							TYPE: 'CHECKBOX',
							LABEL: 'Checkmark'
						},
						EditLink: {
							ID: 'custpage_cwgp_opop_sfld_t_edit',
							TYPE: 'TEXT',
							LABEL: 'Edit',
							LINK_TEXT: 'Edit'
						},
						PrintLink: {
							ID: 'custpage_cwgp_opop_sfld_t_print',
							TYPE: 'TEXT',
							LABEL: 'Print',
							LINK_TEXT: 'Print'
						},
						Subsidiary: {
							ID: 'custpage_cwgp_opop_sfld_t_subsidiary',
							TYPE: 'TEXT',
							LABEL: 'Subsidiary',
							CONTAINER: 'PrimaryInformation'
						},
						Type: {
							ID: 'custpage_cwgp_opop_sfld_t_type',
							TYPE: 'TEXT',
							LABEL: 'Type',
							CONTAINER: 'PrimaryInformation'
						},
						TransDate: {
							ID: 'custpage_cwgp_opop_sfld_t_transdate',
							TYPE: 'DATE',
							LABEL: 'Trans Date',
							CONTAINER: 'PrimaryInformation'
						},
						Routes: {
							ID: 'custpage_cwgp_opop_sfld_t_routes',
							TYPE: 'TEXT',
							LABEL: 'Routes',
							CONTAINER: 'PrimaryInformation'
						},
						FromLocation: {
							ID: 'custpage_cwgp_opop_sfld_t_fromlocation',
							TYPE: 'TEXT',
							LABEL: 'From Location',
							CONTAINER: 'PrimaryInformation'
						},
						ToLocation: {
							ID: 'custpage_cwgp_opop_sfld_t_tolocation',
							TYPE: 'TEXT',
							LABEL: 'To Location',
							CONTAINER: 'PrimaryInformation'
						},
						Firmed: {
							ID: 'custpage_cwgp_opop_sfld_t_firmed',
							TYPE: 'CHECKBOX',
							LABEL: 'Firmed',
							CONTAINER: 'PrimaryInformation'
						},
						ItemCost: {
							ID: 'custpage_cwgp_opop_sfld_t_itemcost',
							TYPE: 'CHECKBOX',
							LABEL: 'Use Item Cost as Transfer Cost',
							CONTAINER: 'PrimaryInformation'
						},
						CreatedDate: {
							ID: 'custpage_cwgp_opop_sfld_t_createddate',
							TYPE: 'DATE',
							LABEL: 'Created Date',
							CONTAINER: 'PrimaryInformation'
						},
						LastModifiedDate: {
							ID: 'custpage_cwgp_opop_sfld_t_lastdate',
							TYPE: 'DATE',
							LABEL: 'Last Modified Date',
							CONTAINER: 'PrimaryInformation'
						},
						PONum: {
							ID: 'custpage_cwgp_opop_sfld_t_ponum',
							TYPE: 'TEXT',
							LABEL: 'PO#',
							CONTAINER: 'PrimaryInformation'
						},
						MFG: {
							ID: 'custpage_cwgp_opop_sfld_t_mfg',
							TYPE: 'TEXT',
							LABEL: 'MFG PO#',
							CONTAINER: 'Additional Information'
						},
						TotalShipWeight: {
							ID: 'custpage_cwgp_opop_sfld_t_totalshipweight',
							TYPE: 'FLOAT',
							LABEL: 'Total Ship Weight',
							CONTAINER: 'Additional Information'
						},
						CaseCount: {
							ID: 'custpage_cwgp_opop_sfld_t_casecount',
							TYPE: 'TEXT',
							LABEL: 'Transfer Order - Case Count #',
							CONTAINER: 'Additional Information'
						},
						TotalQuantity: {
							ID: 'custpage_cwgp_opop_sfld_t_totalquantity',
							TYPE: 'TEXT',
							LABEL: 'Total Quantity',
							CONTAINER: 'Additional Information'
						},
						ShipTemp: {
							ID: 'custpage_cwgp_opop_sfld_t_shiptemperature',
							TYPE: 'TEXT',
							LABEL: 'Ship Temperature',
							CONTAINER: 'Additional Information'
						},
						StorageTemp: {
							ID: 'custpage_cwgp_opop_sfld_t_storagetemp',
							TYPE: 'TEXT',
							LABEL: 'Storage Temperature',
							CONTAINER: 'Additional Information'
						},
						TotalPallets: {
							ID: 'custpage_cwgp_opop_sfld_t_totalpallets',
							TYPE: 'TEXT',
							LABEL: 'Total Pallets',
							CONTAINER: 'Additional Information'
						},
						PalletDimension: {
							ID: 'custpage_cwgp_opop_sfld_t_palletdimension',
							TYPE: 'TEXT',
							LABEL: 'Pallet Dimension',
							CONTAINER: 'Additional Information'
						},
						Item: {
							ID: 'custpage_cwgp_opop_sfld_t_item',
							TYPE: 'TEXT',
							LABEL: 'Item #'
						},
						Description: {
							ID: 'custpage_cwgp_opop_sfld_t_description',
							TYPE: 'TEXT',
							LABEL: 'Description'
						},
						Quantity: {
							ID: 'custpage_cwgp_opop_sfld_t_quantity',
							TYPE: 'INTEGER',
							LABEL: 'Qty'
						},
						FromLocation: {
							ID: 'custpage_cwgp_opop_sfld_t_frmlocation',
							TYPE: 'TEXT',
							LABEL: 'From Location'
						},
						Location: {
							ID: 'custpage_cwgp_opop_sfld_t_location',
							TYPE: 'TEXT',
							LABEL: 'Destination'
						},
						DocNumber: {
							ID: 'custpage_cwgp_opop_sfld_t_docnumber',
							TYPE: 'TEXT',
							LABEL: 'Transfer Order #',
							CONTAINER: 'PrimaryInformation'
						},
						PickUp: {
							ID: 'custpage_cwgp_opop_sfld_t_pickup',
							TYPE: 'DATE',
							LABEL: 'Expected Pick-Up Date',
							CONTAINER: 'PrimaryInformation'
						},
						Delivery: {
							ID: 'custpage_cwgp_opop_sfld_t_delivery',
							TYPE: 'DATE',
							LABEL: 'Exepcted Delivery Date',
							CONTAINER: 'PrimaryInformation'
						},
						Status: {
							ID: 'custpage_cwgp_opop_sfld_t_status',
							TYPE: 'SELECT',
							LABEL: 'Delivery Status',
							SOURCE: 'customlist_cwgp_list_deliverystatus'
						},
						LoadID: {
							ID: 'custpage_cwgp_opop_sfld_t_loadid',
							TYPE: 'TEXT',
							LABEL: 'Load ID'
						},
						Notes: {
							ID: 'custpage_cwgp_opop_sfld_t_notes',
							TYPE: 'TEXTAREA',
							LABEL: 'Notes'
						},
						PriorityLoad: {
							ID: 'custpage_cwgp_opop_sfld_t_priorityload',
							TYPE: 'SELECT',
							LABEL: 'Priority Load',
							SOURCE: 'customlist_cwgp_list_priorityload'
						},
						Carrier: {
							ID: 'custpage_cwgp_opop_sfld_t_carrier',
							TYPE: 'TEXT',
							LABEL: 'Carrier'
						},
						Link: {
							ID: 'custpage_cwgp_opop_sfld_t_link',
							TYPE: 'TEXT',
							LABEL: 'Link'
						},
						Confirmation: {
							ID: 'custpage_cwgp_opop_sfld_t_confirmation',
							TYPE: 'TEXT',
							LABEL: 'Confirmation Number'
						}
			}
	}


    return {
    	FORM_ELEMENTS: FORM_ELEMENTS,
    	SCRIPT_PARAMETERS: SCRIPT_PARAMETERS,
    	SAVED_SEARCH: SAVED_SEARCH,
    	TRANSFER_ORDER : TRANSFER_ORDER
    };
    
});
