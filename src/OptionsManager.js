/* Copyright (c) 2012-2016 Casewise Systems Ltd (UK) - All rights reserved */

/*global cwAPI */
(function (cwApi, $) {
  "use strict";

  var cwManager = function () {
    this.filters = [];
    this.data = {};
    this.paginationOptions = {
      itemsPerPage: {
        availableValues: [25, 50, 100], // always sorted !
        value: 25,
      },
      currentPage: 1,
      maxSize: 3, //Number of pager buttons to show
    };
    this.chartOptions = this.getDefaultChartOptions();
  };
  cwManager.prototype.getDefaultChartOptions = function () {
    var self = this;
    return {
      displaySettings: true,
      availableCharts: [
        { id: "pie", label: "Pie", type: "pie", class: "chart-pie" },
        { id: "bar", label: "Bar", type: "bar", class: "chart-bar" },
        { id: "line", label: "Line", type: "line", class: "chart-line" },
        { id: "stacked-bar", label: "Stacked Bar", type: "bar", class: "chart-bar" },
        { id: "radar", label: "Radar", type: "radar", class: "chart-radar" },
        { id: "horizontal-bar", label: "Horizontal Bar", type: "bar", class: "chart-horizontal-bar" },
        { id: "horizontal-stack-bar", label: "Horizontal Stack Bar", type: "horizontalBar", class: "chart-horizontal-bar" },
      ],
      type: { id: "" },
      data: [],
      labels: [],
      series: [],
      options: {
        onClick: function (event, array) {
          let element = this.getElementAtEvent(event);
          if (element.length > 0) {
            var label = this.data.labels[element[0]._index];
            var series = this.data.datasets[element[0]._datasetIndex].label;
            var value = this.data.datasets[element[0]._datasetIndex].data[element[0]._index];

            cwAPI.customLibs.utils.createPopOutFormultipleObjects(self.itemsBySeriesAndLabels[series + "_" + label]);
          }
        },
        tooltips: {
          mode: "label",
          callbacks: {
            label: function (tooltipItem, data) {
              let sum = 0,
                percentage = 0;
              let value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
              let that = this;

              if (that._chart.config.options.pAxis === that._chart.config.options.series && that._chart.config.type != "pie") {
                // bar chart with the same pAxis and series
                data.datasets.forEach(function (d, index) {
                  sum += d.data[index];
                });

                value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.datasetIndex];
              } else if (data.datasets[tooltipItem.datasetIndex].label) {
                data.datasets.map(function (d, index) {
                  if (that._chart.isDatasetVisible(index)) sum += d.data[tooltipItem.index];
                });
              } else {
                // calculate differently for pie chart
                sum = data.datasets[0].data.reduce(function (s, d, index) {
                  return that._chart.getDatasetMeta(tooltipItem.datasetIndex).data[index].hidden ? s : s + d;
                }, 0);
              }
              percentage = ((value * 100) / sum).toFixed(2) + "%";

              let displayLabel = data.datasets[tooltipItem.datasetIndex].label
                ? data.datasets[tooltipItem.datasetIndex].label
                : data.labels[tooltipItem.index];
              return displayLabel + " : " + value + " (" + percentage + ")";
            },
          },
        },
        legend: {
          display: true,
        },
      },
    };
  };

  cwManager.prototype.init = function (options) {
    try {
      if (options["init-options"] !== "") {
        let o = JSON.parse(options["init-options"]);
        this.filters = o.filters;
        this.setupChart(o.chartOptions);
        this.displayResultList = o.displayResultList;
      }
    } catch (err) {}
  };

  cwManager.prototype.getConfiguration = function () {
    var c = {};
    c.filters = this.filters;
    c.chartOptions = {
      displaySettings: this.chartOptions.displaySettings,
      type: this.chartOptions.type.id,
      options: {
        series: this.chartOptions.options.series,
        pAxis: this.chartOptions.options.pAxis,
      },
    };
    return c;
  };

  cwManager.prototype.setupChart = function (data) {
    try {
      this.chartOptions.displaySettings = data.displaySettings;
      let type,
        self = this;
      this.chartOptions.availableCharts.some(function (item) {
        type = item;
        return item.id === data.type;
      });
      this.chartOptions.type = type;

      Object.keys(data.options).forEach(function (k) {
        self.chartOptions.options[k] = data.options[k];
      });
    } catch (err) {
      this.chartOptions = getDefaultChartOptions();
    }
  };

  cwManager.prototype.refreshChartOptions = function () {
    if (this.chartOptions.type.id === "stacked-bar" || this.chartOptions.type.id === "horizontal-stack-bar") {
      this.chartOptions.options.scales = {
        xAxes: [
          {
            stacked: true,
          },
        ],
        yAxes: [
          {
            stacked: true,
          },
        ],
      };
    } else if (this.chartOptions.options.hasOwnProperty("scales")) {
      delete this.chartOptions.options.scales;
    }
  };

  cwApi.cwLayouts.cwLayoutCustomQuery.optionsManager = cwManager;
})(cwAPI, jQuery);
