/* Copyright (c) 2012-2016 Casewise Systems Ltd (UK) - All rights reserved */

/*global cwAPI */
(function (cwApi, $) {
  "use strict";

  var cwManager = function(){
    this.filters = [];
    this.paginationOptions =  {
      itemsPerPage: {
        availableValues: [25, 50, 100], // always sorted !
          value: 25
      },
      currentPage: 1,
        maxSize: 3 //Number of pager buttons to show
    };
    this.chartOptions = getDefaultChartOptions();
  };

  function getDefaultChartOptions(){
    return {
      displaySettings: true,
      availableCharts: [
        { id: 'pie', label: 'Pie', type:'pie', class: 'chart-pie'},
        { id: 'bar', label: 'Bar', type:'bar', class: 'chart-bar' },
        { id: 'line', label: 'Line', type:'line', class: 'chart-line' },
        { id: 'stacked-bar', label:'Stacked Bar', type:'bar', class: 'chart-bar'},
        { id: 'radar', label: 'Radar', type:'radar', class: 'chart-radar'},
        { id: 'horizontal-bar', label: 'Horizontal Bar', type:'bar', class: 'chart-horizontal-bar'}
      ],
      type: {id:''},
      data: [],
      labels: [],
      series: [],
      options:{
        legend: {
          display: true
        }
      }
    };
  }

  cwManager.prototype.init = function(options){
    try{
      if (options['init-options'] !== ''){
        let o = JSON.parse(options['init-options']);
        this.filters = o.filters;
        this.setupChart(o.chartOptions);
      }
    }
    catch(err){
    }
  };

  cwManager.prototype.getConfiguration = function(){
    var c = {};
    c.filters = this.filters;
    c.chartOptions = {
      displaySettings : this.chartOptions.displaySettings,
      type : this.chartOptions.type.id,
      options : {
        series: this.chartOptions.options.series,
        pAxis: this.chartOptions.options.pAxis
      }
    };
    return c;
  };  

  cwManager.prototype.setupChart = function (data) {
    try {
      this.chartOptions.displaySettings = data.displaySettings;
      this.chartOptions.type = this.chartOptions.availableCharts.find(function(item){
        return item.id === data.type
      });
      Object.assign(this.chartOptions.options, data.options);
    } catch (err) {
      this.chartOptions = getDefaultChartOptions();
    }
  };

  cwManager.prototype.refreshChartOptions = function(){
    if (this.chartOptions.type.value === 'bar' && this.chartOptions.type.stacked === true){
      this.chartOptions.options.scales = {
        xAxes: [{
          stacked: true
        }],
        yAxes: [{
          stacked: true
        }]
      };
    }
    else if (this.chartOptions.options.hasOwnProperty('scales')) {
      delete this.chartOptions.options.scales;
    }
  };

  cwApi.cwLayouts.cwLayoutCustomQuery.optionsManager = cwManager;

}(cwAPI, jQuery));