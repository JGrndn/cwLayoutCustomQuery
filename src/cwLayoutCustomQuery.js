/* Copyright (c) 2012-2016 Casewise Systems Ltd (UK) - All rights reserved */

/*global cwAPI, jQuery, cwConfigurationEditorMapping */
(function (cwApi, $) {
  "use strict";

  var cwLayout = function (options, viewSchema) {
    cwApi.extend(this, cwApi.cwLayouts.CwLayout, options, viewSchema);
    this.drawOneMethod = cwApi.cwLayouts.cwLayoutList.drawOne.bind(this);
    cwApi.registerLayoutForJSActions(this);
    this.optionsManager = new cwApi.cwLayouts.cwLayoutCustomQuery.optionsManager();
    this.defaultColor = ["#803690", "#00ADF9", "#DCDCDC", "#46BFBD", "#FDB45C", "#949FB1", "#4D5360"];
    this.trueFalseArray = [translateText("true"), translateText("false")];
  };

  cwLayout.prototype.getTemplatePath = function (folder, templateName) {
    return cwApi.format("{0}/html/{1}/{2}.ng.html", cwApi.getCommonContentPath(), folder, templateName);
  };

  cwLayout.prototype.matchCriteria = function (item, filters) {
    let i = 0,
      filter,
      propValue,
      filterValue,
      pt;
    for (i = 0; i < filters.length; i += 1) {
      filter = filters[i];
      if (filter.property && filter.operator && filter.value != "") {
        propValue = item.properties[filter.property];
        filterValue = filter.value;
        pt = cwApi.mm.getProperty(item.objectTypeScriptName, filter.property);
        if (pt.type === "Date") {
          propValue = new Date(propValue);
          filterValue = new Date(filter.value);
        }
        switch (filter.operator) {
          case "=":
            if (propValue != filterValue) return false;
            break;
          case "!=":
            if (propValue == filterValue) return false;
            break;
          case ">":
            if (propValue <= filterValue) return false;
            break;
          case "<":
            if (propValue >= filterValue) return false;
            break;
          case ">=":
            if (propValue < filterValue) return false;
            break;
          case "<=":
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
    let objectId, associationTargetNode, i, child, p;
    this.domId = "cwCustomQuery-" + this.nodeID;

    if (cwApi.customLibs.utils === undefined || cwAPI.customLibs.utils.version === undefined || cwAPI.customLibs.utils.version < 2.3) {
      output.push("<h2> Please Install Utils library 2.3 or higher</h2>");
      return;
    }
    if (cwAPI.customLibs.utils && cwAPI.customLibs.utils.getCustomLayoutConfiguration) {
      this.propConfig = cwAPI.customLibs.utils.getCustomLayoutConfiguration("property");
      if (this.propConfig && this.propConfig[this.mmNode.ObjectTypeScriptName.toLowerCase()]) {
        this.propConfig = this.propConfig[this.mmNode.ObjectTypeScriptName.toLowerCase()];
      } else {
        this.propConfig = undefined;
      }
    }

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
    let cwvisible = this.allItems.length > 0 ? "cw-visible" : "";
    output.push('<div id="wrapper-', this.domId, '" class="cwLayoutCustomQuery-wrapper ', cwvisible, '">');
    output.push('<div id="', this.domId, '" class="cwLayoutCustomQuery"></div>');
    output.push("</div>");

    // metadata
    this.selectedProperties = [];
    this.propertiesMetaData = {};
    for (i = 0; i < this.mmNode.PropertiesSelected.length; i += 1) {
      p = cwApi.mm.getProperty(this.mmNode.ObjectTypeScriptName, this.mmNode.PropertiesSelected[i]);
      this.selectedProperties.push(p);
      this.propertiesMetaData[p.scriptName] = {};
      switch (p.type) {
        case "Boolean":
          this.propertiesMetaData[p.scriptName].type = "boolean";
          this.propertiesMetaData[p.scriptName].operators = ["=", "!="];
          this.propertiesMetaData[p.scriptName].values = [
            { label: translateText("true"), value: true },
            { label: translateText("false"), value: false },
          ];
          break;
        case "Integer":
        case "Double":
          this.propertiesMetaData[p.scriptName].type = "number";
          this.propertiesMetaData[p.scriptName].operators = ["=", "!=", "<", ">", "<=", ">="];
          break;
        case "Lookup":
          this.propertiesMetaData[p.scriptName].type = "lookup";
          this.propertiesMetaData[p.scriptName].operators = ["=", "!="];
          this.propertiesMetaData[p.scriptName].lookups = p.lookups;
          break;
        case "Date":
          this.propertiesMetaData[p.scriptName].type = "date";
          this.propertiesMetaData[p.scriptName].operators = ["=", "!=", "<", ">", "<=", ">="];
          break;
        default:
          this.propertiesMetaData[p.scriptName].type = "text";
          this.propertiesMetaData[p.scriptName].operators = ["=", "!=", "<", ">", "<=", ">="];
          break;
      }
    }
  };

  cwLayout.prototype.getDataForChart = function (items, chart) {
    switch (chart.type.id) {
      case "pie":
        return this.getDataForPieChart(items, chart.options);
      case "bar":
      case "line":
      case "horizontal-bar":
      case "horizontal-stack-bar":
      case "stacked-bar":
      case "radar":
        return this.getDataForBarChart(items, chart.options);
      default:
        return {
          labels: [],
          data: [],
          series: [],
        };
    }
  };

  function filterItemWithPropertyValue(self, items, p, value, operand) {
    return items.filter(function (o) {
      if (o.properties[p] !== null && o.properties[p].toString() === value) {
        return true;
      }
      return false;
    });
  }

  function groupByInArray(arr, prop) {
    return arr.reduce(function (groups, item) {
      let val = item.properties[prop];
      groups[val] = groups[val] || [];
      groups[val].push(item);
      return groups;
    }, {});
  }

  function translateText(text) {
    switch (text) {
      case "true":
        return $.i18n.prop("global_true");
      case "false":
        return $.i18n.prop("global_false");
      case cwApi.cwConfigs.UndefinedValue:
        return $.i18n.prop("global_undefined");
      default:
        return text;
    }
  }

  cwLayout.prototype.getDataForBarChart = function (items, opt) {
    let i,
      pSeries,
      pOperand,
      pAxis,
      itemsBySeries = {},
      itemsByLabels = {},
      s,
      l,
      self = this,
      itemsByLabelsSorted = {},
      itemsBySeriesSorted = {},
      res = { data: [], labels: [], series: [], colours: [] };

    this.data = {};
    if (opt.series && opt.pAxis) {
      pSeries = cwApi.mm.getProperty(this.mmNode.ObjectTypeScriptName, opt.series);
      pAxis = cwApi.mm.getProperty(this.mmNode.ObjectTypeScriptName, opt.pAxis);
      itemsBySeries = groupByInArray(items, pSeries.scriptName);
      itemsByLabels = groupByInArray(items, pAxis.scriptName);
      if (pSeries.type === "Lookup") {
        // some lookup values might be missing in series
        for (i = 0; i < pSeries.lookups.length; i += 1) {
          if (!itemsBySeries.hasOwnProperty(pSeries.lookups[i].name)) {
            itemsBySeries[pSeries.lookups[i].name] = [];
          }
          itemsBySeriesSorted[pSeries.lookups[i].name] = itemsBySeries[pSeries.lookups[i].name];
        }
        itemsBySeries = itemsBySeriesSorted;
        if (this.propConfig && this.propConfig[opt.series]) {
          res.colours = Object.keys(itemsBySeries).map(function (ln, index) {
            let id;
            pSeries.lookups.some(function (l) {
              id = l.id;
              return l.name == ln;
            });
            if (self.propConfig[opt.series][id]) {
              if (self.propConfig[opt.series][id].iconColor) return self.propConfig[opt.series][id].iconColor;
              if (self.propConfig[opt.series][id].valueColor) return self.propConfig[opt.series][id].valueColor;
            }
            return self.defaultColor[index];
          });
        }
      } else if (pSeries.type === "Boolean") {
        itemsBySeries = groupByInArray(items, pSeries.scriptName);
        itemsByLabels = groupByInArray(items, pAxis.scriptName);
        // some lookup values might be missing in series
        if (!itemsBySeries.hasOwnProperty("true")) {
          itemsBySeries["true"] = [];
        }
        if (!itemsBySeries.hasOwnProperty("false")) {
          itemsBySeries["false"] = [];
        }
        itemsBySeriesSorted.true = itemsBySeries.true;
        itemsBySeriesSorted.false = itemsBySeries.false;

        itemsBySeries = itemsBySeriesSorted;
        res.colours = Object.keys(itemsBySeries).map(function (l) {
          return l == "false" ? "#DD1111" : "#11DD11";
        });
      } else {
        Object.keys(itemsBySeries)
          .sort()
          .forEach(function (i) {
            itemsBySeriesSorted[i] = itemsBySeries[i];
          });
        itemsBySeriesSorted = itemsBySeries;
      }

      // some values might be missing in labels as well
      if (pAxis.type === "Lookup") {
        for (i = 0; i < pAxis.lookups.length; i += 1) {
          if (!itemsByLabels.hasOwnProperty(pAxis.lookups[i].name)) {
            itemsByLabels[pAxis.lookups[i].name] = [];
          }
          itemsByLabelsSorted[pAxis.lookups[i].name] = itemsByLabels[pAxis.lookups[i].name];
        }
        itemsByLabels = itemsByLabelsSorted;
      } else if (pAxis.type === "Boolean") {
        if (!itemsByLabels.hasOwnProperty("true")) {
          itemsByLabels["true"] = [];
        }
        if (!itemsByLabels.hasOwnProperty("false")) {
          itemsByLabels["false"] = [];
        }
        itemsByLabelsSorted.true = itemsByLabels.true;
        itemsByLabelsSorted.false = itemsByLabels.false;
      } else {
        Object.keys(itemsByLabels)
          .sort()
          .forEach(function (i) {
            itemsByLabelsSorted[i] = itemsByLabels[i];
          });
        itemsByLabels = itemsByLabelsSorted;
      }
      // now we can get data
      for (s in itemsBySeries) {
        let _data = [];
        if (itemsBySeries.hasOwnProperty(s) && res.series.indexOf(translateText(s)) === -1) {
          res.series.push(translateText(s));
        }
        for (l in itemsByLabels) {
          if (itemsByLabels.hasOwnProperty(l) && res.labels.indexOf(translateText(l)) === -1) {
            res.labels.push(translateText(l));
          }
          let _r = filterItemWithPropertyValue(this, itemsBySeries[s], pAxis.scriptName, l);
          this.itemsBySeriesAndLabels[translateText(s) + "_" + translateText(l)] = _r;
          _data.push(_r.length);
        }
        res.data.push(_data);
      }
    }
    res.colours = res.colours.map(this.getColors);
    return res;
  };

  cwLayout.prototype.getColors = function (color) {
    return color;
  };

  cwLayout.prototype.getDataForPieChart = function (items, opt) {
    let p,
      pOp,
      data = [],
      labels = [],
      series = [],
      colours = [];

    if (opt.series) {
      p = cwApi.mm.getProperty(this.mmNode.ObjectTypeScriptName, opt.series);
      if (p.type === "Lookup") {
        for (i = 0; i < p.lookups.length; i += 1) {
          labels.push(translateText(p.lookups[i].name));
          let d = filterItemWithPropertyValue(this, items, p.scriptName, p.lookups[i].name);
          this.itemsBySeriesAndLabels[undefined + "_" + translateText(p.lookups[i].name)] = d;
          data.push(d.length);

          if (this.propConfig[opt.series][p.lookups[i].id]) {
            if (this.propConfig[opt.series][p.lookups[i].id].iconColor) colours.push(this.propConfig[opt.series][p.lookups[i].id].iconColor);
            else if (this.propConfig[opt.series][p.lookups[i].id].valueColor) colours.push(this.propConfig[opt.series][p.lookups[i].id].valueColor);
          } else colours.push(this.defaultColor[i]);
        }
      } else if (p.type === "Boolean") {
        let dTrue = filterItemWithPropertyValue(this, items, p.scriptName, "true");
        this.itemsBySeriesAndLabels["undefined_" + translateText("true")] = dTrue;
        let dFalse = filterItemWithPropertyValue(this, items, p.scriptName, "false");
        this.itemsBySeriesAndLabels["undefined_" + translateText("false")] = dFalse;
        labels.push(translateText("true"));
        labels.push(translateText("false"));
        data.push(dTrue.length);
        data.push(dFalse.length);
      }
    }
    return {
      labels: labels,
      data: data,
      series: series,
      colours: colours,
    };
  };

  cwLayout.prototype.applyJavaScript = function () {
    let that = this;
    cwApi.CwAsyncLoader.load("angular", function () {
      let loader = cwApi.CwAngularLoader,
        templatePath,
        $container = $("#" + that.domId);
      loader.setup();
      templatePath = that.getTemplatePath("cwLayoutCustomQuery", "templateCustomQuery");

      // layout options
      that.optionsManager.init(that.options.CustomOptions);

      loader.loadControllerWithTemplate("cwCustomQueryController", $container, templatePath, function ($scope, $sce) {
        $scope.node = that;
        $scope.templates = {
          filterContainer: that.getTemplatePath("cwLayoutCustomQuery", "templateFilterContainer"),
          dataContainer: that.getTemplatePath("cwLayoutCustomQuery", "templateDataContainer"),
          chartContainer: that.getTemplatePath("cwLayoutCustomQuery", "templateChartContainer"),
        };
        $scope.items = that.items;
        $scope.selectedProperties = that.selectedProperties;
        $scope.propertiesMetadata = that.propertiesMetaData;

        $scope.options = {
          displayResultList: that.optionsManager.displayResultList,
          pagination: that.optionsManager.paginationOptions,
        };
        // filters
        $scope.setItemsPerPage = function (num) {
          $scope.itemsPerPage = num;
          $scope.currentPage = 1; //reset to first page
        };
        $scope.displayFilterBox = false;
        $scope.filters = that.optionsManager.filters;
        $scope.addFilter = function (evt) {
          evt.preventDefault();
          $scope.filters.push({});
        };
        $scope.removeFilter = function (evt, index) {
          evt.preventDefault();
          $scope.filters.splice(index, 1);
        };
        $scope.resetFilter = function (filter) {
          filter.operator = "";
          filter.value = "";
        };
        $scope.applyFilters = function (evt) {
          if (evt) evt.preventDefault();
          let i = 0,
            items = [];
          for (i = 0; i < that.allItems.length; i += 1) {
            if (that.matchCriteria(that.allItems[i], $scope.filters)) {
              items.push(that.allItems[i]);
            }
          }
          $scope.items = items;
          $scope.refreshChart();
        };
        // charts
        $scope.chart = that.optionsManager.chartOptions;

        $scope.filterProperties = function (lstType) {
          return function (item) {
            if (lstType.indexOf(item.type) !== -1) {
              return true;
            }
            return false;
          };
        };
        $scope.refreshChart = function () {
          that.itemsBySeriesAndLabels = {};
          let data = that.getDataForChart($scope.items, $scope.chart);
          that.optionsManager.itemsBySeriesAndLabels = that.itemsBySeriesAndLabels;
          $scope.chart.labels = data.labels;
          $scope.chart.data = data.data;
          $scope.chart.series = data.series;
          $scope.chart.colours = data.colours;
          that.optionsManager.refreshChartOptions();
        };

        $scope.getClassChart = function () {
          return that.optionsManager.getClassChart();
        };

        $scope.displayItemString = function (item) {
          return $sce.trustAsHtml(item.displayName);
        };

        $scope.getTemplatePath = function (filename) {
          return that.getTemplatePath("cwLayoutCustomQuery", filename);
        };

        $scope.isAdminUser = function () {
          if (cwApi.currentUser.PowerLevel === 1) {
            if (cwApi.customLibs && cwApi.customLibs.utils && cwApi.customLibs.utils.copyToClipboard) {
              return true;
            }
            return false;
          }
          return false;
        };

        $scope.getSeriesTooltip = function () {
          switch ($scope.chart.type.id) {
            case "":
              return "";
            case "pie":
              return $.i18n.prop("tooltip_series_pie");
            default:
              return $.i18n.prop("tooltip_series_bar");
          }
        };

        $scope.getAxisTooltip = function () {
          switch ($scope.chart.type.id) {
            case "":
            case "pie":
              return "";
            case "radar":
              return $.i18n.prop("tooltip_axis_radar");
            case "stacked-bar":
            case "horizontal-bar":
            case "bar":
            case "line":
            default:
              return $.i18n.prop("tooltip_axis_pie");
          }
        };

        $scope.copyToClipboard = function () {
          let data = that.optionsManager.getConfiguration(); // get configuration (filters + chart options) as json object
          data.displayResultList = $scope.options.displayResultList;
          let str = angular.toJson(data);
          cwApi.customLibs.utils.copyToClipboard(str);
        };

        $scope.applyFilters();
      });
    });
  };

  cwApi.CwAngularLoader.__proto__.setup = function () {
    if (this.app !== undefined) {
      return;
    }
    /*jslint browser:true*/
    var cwAppName = cwApi.CwAngularLoaderHelper.appName,
      app;
    app = angular.module(cwAppName, [
      "ngDraggable",
      "cfp.hotkeys",
      "localytics.directives",
      "ngSanitize",
      "ngAnimate",
      "xeditable",
      "ui.bootstrap",
      "chart.js",
    ]);
    app.config(function ($controllerProvider, $compileProvider, hotkeysProvider) {
      app.register = {
        controller: $controllerProvider.register,
        directive: $compileProvider.directive,
      };
      hotkeysProvider.includeCheatSheet = false;
    });
    app.filter("highlight", function ($sce) {
      return function (text, phrase) {
        if (phrase) {
          text = text.replace(new RegExp("(" + phrase + ")", "gi"), '<span class="cw-de-highlighted">$1</span>');
        }
        return $sce.trustAsHtml(text);
      };
    });
    app.run(function ($rootScope) {
      $rootScope.cwds = cwApi.CwDataServicesApi;
      $rootScope.i18n = function () {
        return $.i18n.prop.apply(null, arguments);
      };
      $rootScope.cwApi = cwApi;
      $rootScope.currentUser = cwApi.currentUser;
    });
    angular.bootstrap(document, [cwAppName]);
    this.app = app;

    cwApi.ngDirectives.forEach(function (directive) {
      directive();
    });
  };

  cwApi.cwLayouts.cwLayoutCustomQuery = cwLayout;
})(cwAPI, jQuery);
