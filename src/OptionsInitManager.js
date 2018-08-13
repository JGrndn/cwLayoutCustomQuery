/* Copyright (c) 2012-2016 Casewise Systems Ltd (UK) - All rights reserved */

/*global cwAPI */
(function (cwApi, $) {
  "use strict";

  var cwManager = function(){
  };

  function getDefaultPaginationOptions(){
    return {
      itemsPerPage: {
        availableValues: [25, 50, 100],
          value: 25
      },
      currentPage: 1,
        maxSize: 3 //Number of pager buttons to show
    };
  }

  function getDefaultChartOptions(){
    return {
      displayChart: true,
      displaySettings: true,
      availableCharts: [{ value: 'pie', label: 'Pie' }, { value: 'bar', label: 'Bar' }, { value: 'line', label: 'Line' }],
      type: null,
      options: {
        pie: {
          series: null,
          availableOperations: [{ value: 'count', label: 'Count' }, { value: 'sum', label: 'Sum' }],
          operation: 'count',
          pOperation: null,
          options: {
            legend: {
              display: true
            }
          }
        },
        bar: {
          series: null,
          availableOperations: [{ value: 'count', label: 'Count' }, { value: 'sum', label: 'Sum' }],
          operation: 'count',
          pOperation: null,
          pAxis: null,
          displayStackedBar: false,
          options: {
            legend: {
              display: true
            }
          },
          stackedOptions: {
            legend: {
              display: true
            },
            scales: {
              xAxes: [{
                stacked: true
              }],
              yAxes: [{
                stacked: true
              }]
            }
          }
        },
        line: {
          series: null,
          availableOperations: [{ value: 'count', label: 'Count' }, { value: 'sum', label: 'Sum' }],
          operation: 'count',
          pOperation: null,
          pAxis: null,
          options: {
            legend: {
              display: true
            }
          },
        }
      },
      data: [],
      labels: [],
      series: []
    };
  }

  cwManager.prototype.setLayoutOptions = function (options) {
    this.initFilters(options['init-filters']);
    this.initPagination(options['pagination-options']);
    this.initChart(options['chart-options']);
  };

  cwManager.prototype.initFilters = function(json){
    try {
      this.initFilters = (json === '') ? [] : JSON.parse(json);
    } catch (err) {
      this.initFilters = [];
    }
  };

  cwManager.prototype.initPagination = function(json){
    try {
      this.paginationOptions = getDefaultPaginationOptions();
      if (json !== '') {
        var opt = JSON.parse(json);
        this.paginationOptions.itemsPerPage = {
          availableValues: opt.selectItemsPerPage,
          value: opt.nbItemsPerPage
        };
      }
    } catch (err) {
      this.paginationOptions = getDefaultPaginationOptions();
    }
  };

  cwManager.prototype.initChart = function (json) {
    var that = this;
    function replaceOptions(tgtItem, srcItem, key) {
      if (srcItem.hasOwnProperty(key)){
        tgtItem[key] = srcItem[key];
      }
    }

    try {
      this.chartOptions = getDefaultChartOptions();
      if (json !== '') {
        var opt = JSON.parse(json);
        replaceOptions(this.chartOptions, opt, 'displayChart');
        replaceOptions(this.chartOptions, opt, 'displaySettings');
        replaceOptions(this.chartOptions, opt, 'type');
        if (opt.options && opt.options.pie){
          replaceOptions(this.chartOptions.options.pie, opt.options.pie, 'series');
          replaceOptions(this.chartOptions.options.pie, opt.options.pie, 'operation');
          replaceOptions(this.chartOptions.options.pie, opt.options.pie, 'pOperation');
        }
        if (opt.options && opt.options.bar){
          replaceOptions(this.chartOptions.options.bar, opt.options.bar, 'series');
          replaceOptions(this.chartOptions.options.bar, opt.options.bar, 'operation');
          replaceOptions(this.chartOptions.options.bar, opt.options.bar, 'pOperation');
          replaceOptions(this.chartOptions.options.bar, opt.options.bar, 'pAxis');
        }
        if (opt.options && opt.options.line) {
          replaceOptions(this.chartOptions.options.line, opt.options.line, 'series');
          replaceOptions(this.chartOptions.options.line, opt.options.line, 'operation');
          replaceOptions(this.chartOptions.options.line, opt.options.line, 'pOperation');
          replaceOptions(this.chartOptions.options.line, opt.options.line, 'pAxis');
        }
      }
    } catch (err) {
      this.chartOptions = getDefaultChartOptions();
    }
  };

  cwApi.cwLayouts.cwLayoutCustomQuery.optionsManager = cwManager;

}(cwAPI, jQuery));