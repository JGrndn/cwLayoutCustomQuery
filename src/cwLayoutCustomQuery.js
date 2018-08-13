/* Copyright (c) 2012-2016 Casewise Systems Ltd (UK) - All rights reserved */

/*global cwAPI, jQuery, cwConfigurationEditorMapping */
(function (cwApi, $) {
  "use strict";
  
  var cwLayout = function (options, viewSchema) {
    cwApi.extend(this, cwApi.cwLayouts.CwLayout, options, viewSchema);
    this.drawOneMethod = cwApi.cwLayouts.cwLayoutList.drawOne.bind(this);
    cwApi.registerLayoutForJSActions(this);
    this.optionsManager = new cwApi.cwLayouts.cwLayoutCustomQuery.optionsManager();
  };
  
  cwLayout.prototype.getTemplatePath = function (folder, templateName) {
    return cwApi.format('{0}/html/{1}/{2}.ng.html', cwApi.getCommonContentPath(), folder, templateName);
  };
  
  cwLayout.prototype.matchCriteria = function (item, filters) {
    var i = 0, filter, propValue, filterValue, pt;
    for (i = 0; i < filters.length; i += 1) {
      filter = filters[i];
      if (filter.property && filter.operator && filter.value != '') {
        propValue = item.properties[filter.property];
        filterValue = filter.value;
        pt = cwApi.mm.getProperty(item.objectTypeScriptName, filter.property);
        if (pt.type === 'Date'){
          propValue = new Date(propValue);
          filterValue = new Date(filter.value);
        }
        switch (filter.operator) {
          case '=':
            if (propValue != filterValue) return false;
            break;
          case '!=':
            if (propValue == filterValue) return false;
            break;
          case '>':
            if (propValue <= filterValue) return false;
            break;
          case '<':
            if (propValue >= filterValue) return false;
            break;
          case '>=':
            if (propValue < filterValue) return false;
            break;
          case '<=':
            if (propValue > filterValue) return false;
            break;
          default:
            continue;
        }
      }
    }
    return true;
  };

  cwLayout.prototype.drawAssociations = function (output, associationTitleText, object) {
    /*jslint unparam:true*/
    var objectId, associationTargetNode, i, child, p;
    this.domId = 'cwCustomQuery-' + this.nodeID;

    if (cwApi.isUndefinedOrNull(object) || cwApi.isUndefined(object.associations)) {
      // Is a creation page therefore a real object does not exist
      if (!cwApi.isUndefined(this.mmNode.AssociationsTargetObjectTypes[this.nodeID])) {
        objectId = 0;
        associationTargetNode = this.mmNode.AssociationsTargetObjectTypes[this.nodeID];
      } else {
        return;
      }
    } else {
      if (!cwApi.isUndefined(object.associations[this.nodeID])) {
        objectId = object.object_id;
        associationTargetNode = object.associations[this.nodeID];
      } else {
        if (object.iAssociations !== undefined && object.iAssociations[this.nodeID] !== undefined) {
          objectId = object.object_id;
          associationTargetNode = object.iAssociations[this.nodeID];
        } else {
          return;
        }
      }
    }
    this.objectId = objectId === undefined ? 0 : objectId;
    this.allItems = [];
    this.items = [];
    for (i = 0; i < associationTargetNode.length; i += 1) {
      child = associationTargetNode[i];
      child.displayName = this.getDisplayItem(child);
      this.allItems.push(child);
      this.items.push(child);
    }
    var cwvisible = this.allItems.length > 0 ? 'cw-visible' : '';
    output.push('<div id="', this.domId, '" class="cwLayoutCustomQuery ', cwvisible, '"></div>');

    // metadata
    this.selectedProperties = [];
    this.propertiesMetaData = {};
    for (i = 0; i < this.mmNode.PropertiesSelected.length; i += 1) {
      p = cwApi.mm.getProperty(this.mmNode.ObjectTypeScriptName, this.mmNode.PropertiesSelected[i]);
      this.selectedProperties.push(p);
      this.propertiesMetaData[p.scriptName] = {};
      switch (p.type) {
        case 'Boolean':
          this.propertiesMetaData[p.scriptName].type = 'checkbox';
          this.propertiesMetaData[p.scriptName].operators = ['=', '!='];
          break;
        case 'Integer':
        case 'Double':
          this.propertiesMetaData[p.scriptName].type = 'number';
          this.propertiesMetaData[p.scriptName].operators = ['=', '!=', '<', '>', '<=', '>='];
          break;
        case 'Lookup':
          this.propertiesMetaData[p.scriptName].type = 'lookup';
          this.propertiesMetaData[p.scriptName].operators = ['=', '!='];
          this.propertiesMetaData[p.scriptName].lookups = p.lookups;
          break;
        case 'Date':
          this.propertiesMetaData[p.scriptName].type = 'date';
          this.propertiesMetaData[p.scriptName].operators = ['=', '!=', '<', '>', '<=', '>='];
          break;
        default:
          this.propertiesMetaData[p.scriptName].type = 'text';
          this.propertiesMetaData[p.scriptName].operators = ['=', '!=', '<', '>', '<=', '>='];
          break;
      }
    }
  };

  cwLayout.prototype.getDataForChart = function (items, chart) {
    switch (chart.type) {
      case 'pie':
        return this.getDataForPieChart(items, chart.options.pie);
      case 'bar':
        return this.getDataForBarChart(items, chart.options.bar);
      case 'line':
        return this.getDataForBarChart(items, chart.options.line);
      default:
        return {
          labels: [],
          data: [],
          series: []
        };
    }
  };

  function getNumberOfItemsInArray(items, p, value, operand) {
    return items.reduce(function (nb, o) {
      if (o.properties[p] !== null && o.properties[p].toString() === value) {
        return (operand) ? nb + o.properties[operand] : nb + 1;
      }
      return nb;
    }, 0);
  }

  function groupByInArray(arr, prop) {
    return arr.reduce(function (groups, item) {
      var val = item.properties[prop];
      groups[val] = groups[val] || [];
      groups[val].push(item);
      return groups;
    }, {});
  }

  function translateText(text) {
    switch (text) {
      case 'true':
        return $.i18n.prop('global_true');
      case 'false':
        return $.i18n.prop('global_false');
      case cwApi.cwConfigs.UndefinedValue:
        return $.i18n.prop('global_undefined');
      default:
        return text;
    }
  }

  cwLayout.prototype.getDataForBarChart = function (items, opt) {
    var i, pSeries, pOperand, pAxis, itemsBySeries = {}, itemsByLabels = {}, s, l, res = { data: [], labels: [], series: [] };
    if (opt.series !== null && opt.pAxis !== null && (opt.operation === 'count' || (opt.operation === 'sum' && opt.pOperation !== null))) {
      pSeries = cwApi.mm.getProperty(this.mmNode.ObjectTypeScriptName, opt.series);
      pAxis = cwApi.mm.getProperty(this.mmNode.ObjectTypeScriptName, opt.pAxis);
      pOperand = opt.operation === 'sum' ? cwApi.mm.getProperty(this.mmNode.ObjectTypeScriptName, opt.pOperation) : null;
      itemsBySeries = groupByInArray(items, pSeries.scriptName);
      itemsByLabels = groupByInArray(items, pAxis.scriptName);
      if (pSeries.type === 'Lookup') {
        // some lookup values might be missing in series
        for (i = 0; i < pSeries.lookups.length; i += 1) {
          if (!itemsBySeries.hasOwnProperty(pSeries.lookups[i].name)) {
            itemsBySeries[pSeries.lookups[i].name] = [];
          }
        }
      } else if (pSeries.type === 'Boolean') {
        itemsBySeries = groupByInArray(items, pSeries.scriptName);
        itemsByLabels = groupByInArray(items, pAxis.scriptName);
        // some lookup values might be missing in series
        if (!itemsBySeries.hasOwnProperty('true')) {
          itemsBySeries['true'] = [];
        }
        if (!itemsBySeries.hasOwnProperty('false')) {
          itemsBySeries['false'] = [];
        }
      }
      // some values might be missing in labels as well
      if (pAxis.type === 'Lookup') {
        for (i = 0; i < pAxis.lookups.length; i += 1) {
          if (!itemsByLabels.hasOwnProperty(pAxis.lookups[i].name)) {
            itemsByLabels[pAxis.lookups[i].name] = [];
          }
        }
      } else if (pAxis.type === 'Boolean') {
        if (!itemsByLabels.hasOwnProperty('true')) {
          itemsByLabels['true'] = [];
        }
        if (!itemsByLabels.hasOwnProperty('false')) {
          itemsByLabels['false'] = [];
        }
      }
      // now we can get data
      for (s in itemsBySeries) {
        var _data = [];
        if (itemsBySeries.hasOwnProperty(s) && res.series.indexOf(translateText(s)) === -1) {
          res.series.push(translateText(s));
        }
        for (l in itemsByLabels) {
          if (itemsByLabels.hasOwnProperty(l) && res.labels.indexOf(translateText(l)) === -1) {
            res.labels.push(translateText(l));
          }
          var _nb = pOperand === null ? getNumberOfItemsInArray(itemsBySeries[s], pAxis.scriptName, l) : getNumberOfItemsInArray(itemsBySeries[s], pAxis.scriptName, l, pOperand.scriptName);
          _data.push(_nb);
        }
        res.data.push(_data);
      }
    }
    return res;
  };

  cwLayout.prototype.getDataForPieChart = function (items, opt) {
    var p, pOp, data = [], labels = [], series = [];

    if (opt.series !== null && (opt.operation === 'count' || (opt.operation === 'sum' && opt.pOperation !== null))) {
      p = cwApi.mm.getProperty(this.mmNode.ObjectTypeScriptName, opt.series);
      pOp = opt.operation === 'sum' ? cwApi.mm.getProperty(this.mmNode.ObjectTypeScriptName, opt.pOperation) : null;
      if (p.type === 'Lookup') {
        for (i = 0; i < p.lookups.length; i += 1) {
          labels.push(translateText(p.lookups[i].name));
          var d = opt.operation === 'count' ? getNumberOfItemsInArray(items, p.scriptName, p.lookups[i].name) : getNumberOfItemsInArray(items, p.scriptName, p.lookups[i].name, pOp.scriptName);
          data.push(d);
        }
      } else if (p.type === 'Boolean') {
        var dTrue = opt.operation === 'count' ? getNumberOfItemsInArray(items, p.scriptName, 'true') : getNumberOfItemsInArray(items, p.scriptName, 'true', pOp.scriptName);
        var dFalse = opt.operation === 'count' ? getNumberOfItemsInArray(items, p.scriptName, 'false') : getNumberOfItemsInArray(items, p.scriptName, 'false', pOp.scriptName);
        labels.push(translateText('true'));
        labels.push(translateText('false'));
        data.push(dTrue);
        data.push(dFalse);
      }
    }
    return {
      labels: labels, data: data, series: series
    };
  };

  

  cwLayout.prototype.applyJavaScript = function () {
    var that = this;
    cwApi.CwAsyncLoader.load('angular', function () {
      var loader = cwApi.CwAngularLoader, templatePath, $container = $('#' + that.domId);
      loader.setup();
      templatePath = that.getTemplatePath('cwLayoutCustomQuery', 'templateCustomQuery');
      
      // layout options
      that.optionsManager.setLayoutOptions(that.options.CustomOptions);

      loader.loadControllerWithTemplate('cwCustomQueryController', $container, templatePath, function ($scope) {
        $scope.objectId = that.objectId;
        $scope.node = that;
        $scope.templates = {
          'filterContainer' : that.getTemplatePath('cwLayoutCustomQuery', 'templateFilterContainer'),
          'dataContainer': that.getTemplatePath('cwLayoutCustomQuery', 'templateDataContainer'),
          'chartContainer': that.getTemplatePath('cwLayoutCustomQuery', 'templateChartContainer')
        };
        $scope.items = that.items;
        $scope.selectedProperties = that.selectedProperties;
        $scope.propertiesMetadata = that.propertiesMetaData;

        // pagination
        $scope.pagination = that.optionsManager.paginationOptions;

        // filters
        $scope.setItemsPerPage = function (num) {
          $scope.itemsPerPage = num;
          $scope.currentPage = 1; //reset to first page
        }
        $scope.displayFilterBox = false;
        $scope.toggleFilter = function(){
          $scope.displayFilterBox = !$scope.displayFilterBox;
        };
        $scope.filters = that.optionsManager.initFilters; 
        $scope.addFilter = function (evt) {
          evt.preventDefault();
          $scope.filters.push({});
        };
        $scope.removeFilter = function (evt, index) {
          evt.preventDefault();
          $scope.filters.splice(index, 1);
        };
        $scope.resetFilter = function (filter) {
          filter.operator = '';
          filter.value = '';
        };
        $scope.applyFilters = function(evt){
          if (evt) evt.preventDefault();
          var i=0, items = [];
          for(i=0; i<that.allItems.length; i+=1){
            if(that.matchCriteria(that.allItems[i], $scope.filters)){
              items.push(that.allItems[i]);
            }
          }
          $scope.items = items;
          $scope.refreshChart();
        };
        // charts
        $scope.chart = that.optionsManager.chartOptions;

        $scope.filterProperties = function(lstType){
          return function(item){
            if (lstType.indexOf(item.type) !== -1){
              return true;
            }
            return false;
          };
        };
        $scope.refreshChart = function(){
          var data = that.getDataForChart($scope.items, $scope.chart);
          $scope.chart.labels = data.labels;
          $scope.chart.data = data.data;
          $scope.chart.series = data.series;
        };

        $scope.applyFilters();
      });
    });
  };
  

  cwApi.cwLayouts.cwLayoutCustomQuery = cwLayout;
  
  
  
}(cwAPI, jQuery));