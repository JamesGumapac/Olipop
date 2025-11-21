/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @description Component Lots sublist on Assembly Build (tab custom1810)
 */
define(["N/ui/serverWidget", "N/search", "N/record", "N/log"], (
  serverWidget,
  search,
  record,
  log,
) => {
  const COMPONENT_SUBLIST_ID = "component";

  /**
   * Extract Component Item IDs from the BOM Revision.
   * Source priority:
   * 1) custrecord_mfgmob_mm_auto_issue_list
   * 2) component sublist inside BOM Revision
   */
  const getComponentItemIdsFromBomRevision = (newRecord) => {
    const ids = new Set();
    try {
      const bomRevisionId = newRecord.getValue("billofmaterialsrevision");
      if (!bomRevisionId) return [];

      const bomRev = record.load({
        type: "bomrevision",
        id: bomRevisionId,
        isDynamic: false,
      });

      // 1) Custom field custrecord_mfgmob_mm_auto_issue_list
      const list =
        bomRev.getValue("custrecord_mfgmob_mm_auto_issue_list") || "";
      if (list) {
        list.split("|").forEach((line) => {
          const [itemId] = line.split(",");
          if (itemId) ids.add(String(itemId));
        });
      }

      // 2) Line items inside BOM Revision > component sublist
      const compCount = bomRev.getLineCount("component");
      for (let i = 0; i < compCount; i++) {
        const itemId = bomRev.getSublistValue({
          sublistId: "component",
          fieldId: "item",
          line: i,
        });
        if (itemId) ids.add(String(itemId));
      }
    } catch (e) {
      log.error("getComponentItemIdsFromBomRevision", e);
    }
    return Array.from(ids);
  };

  /** Build map itemId --> label */
  const buildItemLabelMap = (itemIds) => {
    const map = new Map();
    if (!itemIds || !itemIds.length) return map;

    try {
      const s = search.create({
        type: search.Type.ITEM,
        filters: [["internalid", "anyof", itemIds]],
        columns: ["itemid", "displayname", "salesdescription"],
      });

      s.run().each((res) => {
        const id = String(res.id);
        const itemid = res.getValue("itemid");
        const display =
          res.getValue("displayname") || res.getValue("salesdescription") || "";
        map.set(id, display ? `${itemid} : ${display}` : itemid);
        return true;
      });
    } catch (e) {
      log.error("buildItemLabelMap", e);
    }

    return map;
  };

  /** Build Component Lots Sublist */
  const buildComponentLotsSublist = ({ form, itemLabelMap }) => {
    const tabId = "custom1810";

    const sublist = form.addSublist({
      id: "custpage_component_lot_sublist",
      label: "Component Lots",
      type: serverWidget.SublistType.INLINEEDITOR,
      tab: tabId,
    });

    const itemField = sublist.addField({
      id: "custpage_item",
      label: "Component Item",
      type: serverWidget.FieldType.SELECT,
    });
    itemField.addSelectOption({ value: "", text: "" });

    itemLabelMap.forEach((label, id) =>
      itemField.addSelectOption({ value: id, text: label }),
    );

    const lotField = sublist.addField({
      id: "custpage_lot_number",
      label: "Lot Number",
      type: serverWidget.FieldType.SELECT,
    });
    lotField.addSelectOption({ value: "", text: "" });

    sublist.addField({
      id: "custpage_expiration_date",
      label: "Expiration Date",
      type: serverWidget.FieldType.DATE,
    });

    sublist.addField({
      id: "custpage_quantity",
      label: "Quantity",
      type: serverWidget.FieldType.FLOAT,

    });

    sublist.addField({
      id: "custpage_location",
      label: "Location",
      type: serverWidget.FieldType.SELECT,
      source: "location",
    });
  };

  /** beforeLoad */
  const beforeLoad = (ctx) => {
    const { form, newRecord, type } = ctx;

    if (type === ctx.UserEventType.DELETE) return;
    if (newRecord.type !== record.Type.ASSEMBLY_BUILD) return;

    const itemIds = getComponentItemIdsFromBomRevision(newRecord);
    const itemLabelMap = buildItemLabelMap(itemIds);

    buildComponentLotsSublist({ form, itemLabelMap });

    form.clientScriptModulePath =
      "SuiteScripts/cwgp/client/OLIPOP_CS_AS_CreateLotTBility.js";
  };

  return { beforeLoad };
});
