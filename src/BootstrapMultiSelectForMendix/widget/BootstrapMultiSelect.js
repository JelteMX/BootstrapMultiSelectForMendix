/*global logger*/
/*
    BootstrapMultiSelectForMendix
    ========================

    @file      : BootstrapMultiSelect.js
    @version   : 2.0.1
    @author    : Iain Lindsay
    @date      : 2017-06-27
    @copyright : AuraQ Limited 2017
    @license   : Apache v2

    Documentation
    ========================
    This widget is a wrapper for the Bootstrap multi select control by David Stutz:
    https://github.com/davidstutz/bootstrap-multiselect

    Available options are held in a separate entity, selected items are stored in a reference set association to that entity.
*/
define( [
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_AttachMixin",
    "mxui/dom",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/_base/kernel",
    "BootstrapMultiSelectForMendix/lib/jquery-1.11.2",
    "BootstrapMultiSelectForMendix/lib/bootstrap",
    "BootstrapMultiSelectForMendix/lib/bootstrap-multiselect",
    "dojo/text!BootstrapMultiSelectForMendix/widget/templates/BootstrapMultiSelect.html"
], function (declare, _WidgetBase, _TemplatedMixin, _AttachMixin, dom, dojoClass, domConstruct, dojoArray, lang, dojo, _jQuery, _bootstrap, _bootstrapMultiSelect, widgetTemplate) {
    "use strict";

    var $ = _jQuery.noConflict(true);
    $ = _bootstrap.createInstance($);
    $ = _bootstrapMultiSelect.createInstance($);

    return declare("BootstrapMultiSelectForMendix.widget.BootstrapMultiSelect", [_WidgetBase, _TemplatedMixin], {

        templateString: widgetTemplate,

        dataAssociation: "",
        dataAttribute: "",
        fieldCaption: "",
        formOrientation: "",

        _entity: null,
        _reference: null,
        _handles: null,
        _contextObj: null,
        _$alertdiv: null,
        _$combo: null,
        _comboData : [],
        _sortParams : [],
        variableData : [],
        _attributeList: null,
        _bypassDataRefresh : null,

        constructor: function () {
            this._handles = [];
        },

        postCreate: function () {

            this._entity = this.dataAssociation.split("/")[1];
            this._reference = this.dataAssociation.split("/")[0];
            this._attributeList = this._variableContainer;
            this._bypassDataRefresh = false;

            // issues with the sort parameters being persisted between widget instances mean we set the sort array to empty.
            this._sortParams = [];
            // create our sort order array
            for (var i=0;i<this.sortContainer.length;i++) {
                var item = this.sortContainer[i];
                this._sortParams.push([item.sortAttribute, item.sortOrder]);
            }

            // make sure we only select the control for the current id or we"ll overwrite previous instances
            var selector = "#" + this.id + " select.multiSelect";
            this._$combo = $(selector);

            // adjust the template based on the display settings.
            if( this.showLabel ) {
                if(this.formOrientation === "horizontal"){
                    // width needs to be between 1 and 11
                    var comboLabelWidth = this.labelWidth < 1 ? 1 : this.labelWidth;
                    comboLabelWidth = this.labelWidth > 11 ? 11 : this.labelWidth;

                    var comboControlWidth = 12 - comboLabelWidth,
                        comboLabelClass = "col-sm-" + comboLabelWidth,
                        comboControlClass = "col-sm-" + comboControlWidth;

                    dojoClass.add(this.multiSelectLabel, comboLabelClass);
                    dojoClass.add(this.multiSelectComboContainer, comboControlClass);
                }

                this.multiSelectLabel.innerHTML = this.fieldCaption;
            }
            else {
                dojoClass.remove(this.multiSelectMainContainer, "form-group");
                domConstruct.destroy(this.multiSelectLabel);
            }
        },

        update: function (obj, callback) {

            var self = this;

            if (obj === null) {
                if (!dojoClass.contains(this.domNode, "hidden")) {
                    dojoClass.add(this.domNode, "hidden");
                }
            } else {
                if (dojoClass.contains(this.domNode, "hidden")) {
                    dojoClass.remove(this.domNode, "hidden");
                }
                this._contextObj = obj;
                this._resetSubscriptions();

                this._$combo.multiselect({
                    numberDisplayed : this.itemsToDisplay,
                    maxHeight: 200, // TODO... make this configurable
                    includeSelectAllOption: self.addSelectAll,
                    includeSelectAllDivider: self.addSelectAll,
                    buttonClass: "form-control",
                    dropRight: true,
                    selectAllText : this.selectAllText,
                    nonSelectedText : this.noneSelectedText,
                    allSelectedText : this.allSelectedText,
                    nSelectedText : this.numberSelectedText,
                    enableFiltering : this.addFilter,
                    enableCaseInsensitiveFiltering : !this.caseSensitiveFilter,
                    onChange: function(option, checked, select) {
                        var visibleOptions;
                        // we don"t want changes here to re-load the data when the attribute subscription kicks in
                        self._bypassDataRefresh = true;
                        // in the absence of an "onDeselectAll" event we assume
                        // its the selectall checkbox if the option value is undefined
                        if( option === undefined ) {
                            var guids = [];
                            if (checked){
                                // if there is a filter we need to pull back only the visible options, otherwise we'll update all items
                                if(self.addFilter){
                                    visibleOptions = self._getVisibleOptions();
                                    dojoArray.forEach(visibleOptions, function (availableObject, index) {
                                        var guid = availableObject.value;
                                        guids.push(guid);
                                    });

                                    self._contextObj.addReferences(self._reference, guids);

                                } else{
                                    dojoArray.forEach(self._comboData, function (availableObject, index) {
                                        var guid = availableObject.value;
                                        guids.push(guid);
                                    });
                                    self._contextObj.addReferences(self._reference, guids);
                                }
                            } else {
                               // if there is a filter we need to pull back only the visible options, otherwise we"ll update all items
                                if(self.addFilter){
                                    visibleOptions = self._getVisibleOptions();
                                    dojoArray.forEach(visibleOptions, function (availableObject, index) {
                                        var guid = availableObject.value;
                                        guids.push(guid);
                                    });

                                    self._contextObj.removeReferences(self._reference, guids);
                                } else{
                                    dojoArray.forEach(self._comboData, function (availableObject, index) {
                                        var guid = availableObject.value;
                                        guids.push(guid);
                                    });
                                    self._contextObj.removeReferences(self._reference, guids);
                                }
                            }
                        } else {
                            var guid = $(option).val();
                            if (checked){
                                self._contextObj.addReference(self._reference, guid);
                            } else {
                                self._contextObj.removeReferences(self._reference, [guid]);
                            }
                        }

                        self._bypassDataRefresh = false;

                        // run the OC microflow if one has been configured.
                        if (self.onChangeMicroflow ) {
                            self._execMf(self._contextObj.getGuid(), self.onChangeMicroflow, self.onChangeMicroflowShowProgress, self.onChangeMicroflowProgressMessage);
                        }
                    }
                });

                // load the available options and ticks the already associated options.
                this._loadComboData();
            }

            // Execute callback.
            this._executeCallback(callback, "update");
        },

        resize: function (box) {},

        uninitialize: function () {
            this._comboData = [];
            this._sortParams = [];
        },

        _getVisibleOptions:function(){
            var options = [];
            var selector = "#" + this.id + " .btn-group li:not(.multiselect-item):not(.filter-hidden)";
            $.each($(selector), function(index, element) {
                var value = $("input", element).length > 0 ? $("input", element).val() : "";
                var text = $("label", element).text();
                var newOption = {};
                newOption.value = value;
                newOption.text = text;

                options.push(newOption);
            });

            return options;
        },

        _updateControlDisplay : function(){
            // fixed property gets checked first
            if(this.disabled){
                this._$combo.multiselect("disable");

            } else{
                this._$combo.multiselect("enable");
            }
            // attribute property beats fixed property
            if(this.disabledViaAttribute){
                if(this._contextObj.get(this.disabledViaAttribute) ){
                    this._$combo.multiselect("disable");
                } else{
                    this._$combo.multiselect("enable");
                }
            }

            // fixed property gets checked first
            if(this.visible){
                if (dojoClass.contains(this.domNode, "hidden")) {
                    dojoClass.remove(this.domNode, "hidden");
                }
            } else {
                if (!dojoClass.contains(this.domNode, "hidden")) {
                    dojoClass.add(this.domNode, "hidden");
                }
            }

            // attribute property beats fixed property
            if(this.visibleViaAttribute ){
                if(this._contextObj.get(this.visibleViaAttribute)){
                    if (dojoClass.contains(this.domNode, "hidden")) {
                        dojoClass.remove(this.domNode, "hidden");
                    }
                } else {
                    if (!dojoClass.contains(this.domNode, "hidden")) {
                        dojoClass.add(this.domNode, "hidden");
                    }
                }
            }
        },

        // retrieves the data from the child entity, applying the required constraint
        _loadComboData: function () {
            // Important to clear all validations!
            this._clearValidations();

            // reset our data
            var xpath = "//" + this._entity + this.dataConstraint.replace(/\[\%CurrentObject\%\]/gi, this._contextObj.getGuid());
            mx.data.get({
                xpath: xpath,
                filter: {
                    sort: this._sortParams,
                    offset: 0
                },
                callback: lang.hitch(this, this._processComboData)
            });
        },

        // sets up the available combo options
        _processComboData: function (objs) {
            var self = this;
            // reset our data
            this._comboData = [];
            this.variableData = []; // this will hold our variables
            var referenceAttributes = [];

            dojoArray.forEach(objs, function (availableObject, index) {
                var currentVariable = {};
                currentVariable.guid = availableObject.getGuid();
                currentVariable.variables = [];

                for (var i = 0; i < self._attributeList.length; i++) {
                    if (availableObject.get(self._attributeList[i].variableAttribute) !== null) {
                        var value = self._fetchAttribute(availableObject, self._attributeList[i].variableAttribute, i);

                        currentVariable.variables.push({
                            id: i,
                            variable: self._attributeList[i].variableName,
                            value: value
                        });
                    } else {
                        // add a placeholder for our reference variable value.
                        currentVariable.variables.push({
                            id: i,
                            variable: self._attributeList[i].variableName,
                            value: "" // set this later
                        });

                        var split = self._attributeList[i].variableAttribute.split("/");
                        var refAttribute = {};
                        for(var a in self._attributeList[i]) refAttribute[a]=self._attributeList[i][a];
                        refAttribute.attributeIndex = i;
                        refAttribute.parentGuid = availableObject.getGuid();
                        refAttribute.referenceGuid = availableObject.getReference(split[0]);
                        refAttribute.referenceAttribute = split[2];

                        referenceAttributes.push(refAttribute);
                    }
                }

                self.variableData.push(currentVariable);

            });

             if( referenceAttributes.length > 0 ){
                // get values for our references
                this._fetchReferences(referenceAttributes, this._formatResults);
            } else{
                // format the results
                lang.hitch(this, this._formatResults)();
            }
        },

        _fetchAttribute: function (obj, attr, i, escapeValues) {
            logger.debug(this.id + "._fetchAttribute");
            var returnvalue = "",
                options = {},
                numberOptions = null;

            // Referenced object might be empty, can"t fetch an attr on empty
            if (!obj) {
                return "";
            }

            if (obj.isDate(attr)) {
                if (this._attributeList[i].datePattern !== "") {
                    options.datePattern = this._attributeList[i].datePattern;
                }
                if (this._attributeList[i].timePattern !== "") {
                    options.timePattern = this._attributeList[i].timePattern;
                }
                returnvalue = this._parseDate(this._attributeList[i].datetimeformat, options, obj.get(attr));
            } else if (obj.isEnum(attr)) {
                returnvalue = this._checkString(obj.getEnumCaption(attr, obj.get(attr)), escapeValues);
            }  else if (obj.isNumeric(attr) || obj.isCurrency(attr) || obj.getAttributeType(attr) === "AutoNumber") {
                numberOptions = {};
                numberOptions.places = this._attributeList[i].decimalPrecision;
                if (this._attributeList[i].groupDigits) {
                    numberOptions.locale = dojo.locale;
                    numberOptions.groups = true;
                }

                returnvalue = mx.parser.formatValue(obj.get(attr), obj.getAttributeType(attr), numberOptions);
            } else {
                if (obj.getAttributeType(attr) === "String") {
                    returnvalue = this._checkString(mx.parser.formatAttribute(obj, attr), escapeValues);
                }
            }

            if (returnvalue === "") {
                return "";
            } else {
                return returnvalue;
            }
        },

        _fetchReferences: function (referenceAttributes, formatResultsFunction, callback) {
            logger.debug(this.id + "._fetchReferences");
            var self = this;
            var l = referenceAttributes.length;

            var callbackfunction = function (data, obj) {
                logger.debug(this.id + "._fetchReferences get callback");
                var value = this._fetchAttribute(obj, data.referenceAttribute, data.attributeIndex);

                var result = $.grep(this.variableData, function(e){
                    return e.guid === data.parentGuid;
                });

                if( result && result[0] ){
                    var resultVariable = $.grep(result[0].variables, function(e){ return e.id === data.attributeIndex; });
                    if( resultVariable && resultVariable[0]){
                        resultVariable[0].value = value;
                    }
                }

                l--;
                if (l <= 0) {
                    // format our results
                    lang.hitch(this, formatResultsFunction, callback)();
                }
            };

            for (var i = 0; i < referenceAttributes.length; i++) {
                var listObj = referenceAttributes[i],
                    split = referenceAttributes[i].variableAttribute.split("/"),
                    guid = referenceAttributes[i].referenceGuid,
                    attributeIndex = referenceAttributes[i].attributeIndex,
                    parentGuid = referenceAttributes[i].parentGuid,
                    referenceAttribute = referenceAttributes[i].referenceAttribute,
                    dataparam = {
                        i: i,
                        listObj: listObj,
                        attributeIndex: attributeIndex,
                        parentGuid : parentGuid,
                        referenceAttribute : referenceAttribute
                    };


                if (guid !== "") {
                    mx.data.get({
                        guid: guid,
                        callback: lang.hitch(this, callbackfunction, dataparam)
                    });
                }
            }
        },

        _formatResults : function(){
            // an array that will be populated with our results
            var display = "";

            for(var i = 0;i< this.variableData.length; i++){
                display = this._mergeTemplate(this.variableData[i].variables, this.displayTemplate, true);

                var optionLabel = display,
                    optionValue = this.variableData[i].guid,
                    item = {
                        label: optionLabel, value: optionValue, selected: false
                    };

                this._comboData.push(item);
            }

            this._setReferencedObjects();
        },

        _checkString: function (str, escapeValues) {
            logger.debug(this.id + "._checkString");
            if (str.indexOf("<script") > -1 || escapeValues) {
                str = dom.escapeString(str);
            }
            return str;
        },

        _parseDate: function (format, options, value) {
            logger.debug(this.id + "._parseDate");
            var datevalue = value;

            if (value === "") {
                return value;
            }

            options.selector = format;
            datevalue = dojo.date.locale.format(new Date(value), options);

            return datevalue;
        },

        _mergeTemplate : function(variables, template, escapeTemplate) {
            var self = this;

            if( escapeTemplate ){
                template = dom.escapeString(template);
            }

            for (var attr in variables) {
                var settings = variables[attr];
                template = template.split("${" + settings.variable + "}").join(settings.value);
            }

            return template;
        },

        // marks referenced objects as selected in the combo options.
        _setReferencedObjects: function () {
            if(!this._bypassDataRefresh){
                var referencedObjects = this._contextObj.getReferences(this._reference);

                if(referencedObjects !== null && referencedObjects !== "") {
                    dojoArray.forEach(this._comboData, function (availableObject, index) {
                        // reset to false first
                        availableObject.selected = false;
                        //check if this is a current tag
                        if( referencedObjects.indexOf(availableObject.value) >= 0){
                            availableObject.selected = true;
                        }

                    }, this);
                }

                // update array and set selected flag based on referenced options
                this._$combo.multiselect("dataprovider", this._comboData);

                // finally update the display
                this._updateControlDisplay();
            }
        },

        _execMf: function (guid, mf, showProgress, message) {
            if (guid && mf) {
                var options = {
                    origin : this.mxform,
                    params: {
                        applyto: "selection",
                        actionname: mf,
                        guids: [guid]
                    },
                    error: lang.hitch(this, function (e) {
                        logger.error("Error running Microflow: " + e);
                    })
                };

                if(showProgress){
                    options.progress = "modal";
                    options.progressMsg = message;
                }

                mx.ui.action(mf, options, this);
            }
        },

        _resetSubscriptions: function () {
            // Release handle on previous object, if any.
            this.unsubscribeAll();

            if (this._contextObj) {
                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, function (guid) {
                        mx.data.get({
                            guid: guid,
                            callback: lang.hitch(this, function (obj) {
                                this._contextObj = obj;
                                if(!this.reloadDataViaAttribute || (this.reloadDataViaAttribute && this._contextObj.get(this.reloadDataViaAttribute) ) ){
                                    this._loadComboData();
                                }
                            })
                        });
                    })
                });

                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this._reference,
                    callback: lang.hitch(this, function (guid) {
                        mx.data.get({
                            guid: guid,
                            callback: lang.hitch(this, function (obj) {
                                this._setReferencedObjects();
                            })
                        });
                    })
                });

                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: lang.hitch(this, this._handleValidation)
                });
            }
        },

        _handleValidation: function (validations) {
            logger.debug(this.id + "._handleValidation");
            this._clearValidations();

            var validation = validations[0],
                message = validation.getReasonByAttribute(this._reference);

            if (this.readOnly) {
                validation.removeAttribute(this._reference);
            } else {
                if (message) {
                    this._addValidation(message);

                    validation.removeAttribute(this._reference);
                }
            }
        },

        _clearValidations: function () {
            if( this._$alertdiv ) {
                this._$combo.parent().removeClass("has-error");
                this._$alertdiv.remove();
            }
        },

        _addValidation: function (msg) {
            this._$alertdiv = $("<div></div>").addClass("alert alert-danger mx-validation-message").html(msg);
            this._$combo.parent().addClass("has-error").append( this._$alertdiv );
        },

        _executeCallback: function (cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        }
    });
});

require(["BootstrapMultiSelectForMendix/widget/BootstrapMultiSelect"]);
