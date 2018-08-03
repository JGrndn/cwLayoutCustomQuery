/*global cwAPI, jQuery, angular*/

(function (cwApi, $) {
    'use strict';

    var CwAngularLoader, templatesCache = {},
        ngHelper = {
            appName: 'cwapp',
            convertToOption: function (values) {
                var ret = [];
                for (var k in values)
                    if (values.hasOwnProperty(k))
                        ret.push({
                            key: +k,
                            value: values[k]
                        });
                return ret;
            }
        };

    CwAngularLoader = function () {
        this.loadedDirectives = {};
        this.editableScopes = {};
        return undefined;
    };

    CwAngularLoader.prototype.setup = function () {
        if (this.app !== undefined) {
            return;
        }
        /*jslint browser:true*/
        var cwAppName = ngHelper.appName,
            app;
        //app = angular.module(cwAppName, ['ngDraggable', 'cfp.hotkeys', 'localytics.directives', 'ngSanitize', 'ngAnimate', 'xeditable']);
        app = angular.module(cwAppName, ['ngDraggable', 'cfp.hotkeys', 'localytics.directives', 'ngSanitize', 'ngAnimate', 'xeditable', 'ui.bootstrap', 'chart.js']);
        app.config(function ($controllerProvider, $compileProvider, hotkeysProvider) {
            app.register = {
                controller: $controllerProvider.register,
                directive: $compileProvider.directive
            };
            hotkeysProvider.includeCheatSheet = false;
        });
        app.filter('highlight', function ($sce) {
            return function (text, phrase) {
                if (phrase) {
                    text = text.replace(new RegExp('(' + phrase + ')', 'gi'), '<span class="cw-de-highlighted">$1</span>');
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

    CwAngularLoader.prototype.registerHub = function ($scope, hubName, methodsList, callback) {
        var connection, proxy, boomerang;
        connection = $.hubConnection();
        $scope.hub = $.connection[hubName];
        connection.url = cwApi.getServerPath() + 'signalR';
        if (cwApi.signalRSeverPath !== undefined) {
            connection.url = cwApi.signalRSeverPath;
        }
        proxy = connection.createHubProxy(hubName);
        boomerang = new cwApi.CwBoomerang($scope.hub, cwApi.getSiteId(), methodsList);
        boomerang.registerOnProxy($scope, proxy);
        connection.start(cwApi.getWebSocketOptions()).done(function () {
            $scope.$apply(function () {
                return callback && callback(boomerang);
            });
        });
    };

    CwAngularLoader.prototype.registerAttributeDirective = function (directiveName, method, transclude) {
        this.registerDirective(directiveName, function () {
            var res = {
                restrict: 'A',
                link: method
            };
            if (transclude === undefined) {
                transclude = true;
            }
            res.transclude = transclude;
            return res;
        });
    };

    CwAngularLoader.prototype.registerDirective = function (directiveName, method) {
        if (this.loadedDirectives[directiveName] === undefined) {
            this.app.register.directive(directiveName, method);
            this.loadedDirectives[directiveName] = true;
        }
    };

    CwAngularLoader.prototype.injectAngular = function ($c) {
        angular.element(document).injector().invoke(function ($compile, $rootScope) {
            var scope = angular.element($c).scope();
            $compile($c)(scope);
            setTimeout(function () {
                $rootScope.$apply();
            }, 0);
        });
    };

    CwAngularLoader.prototype.loadController = function (controllerName, $container, controllerMethod) {
        $container.attr('ng-controller', controllerName);
        this.app.register.controller(controllerName, controllerMethod);
        this.injectAngular($container);
    };

    CwAngularLoader.prototype.removeControllerAttr = function (controllerName) {
        $(cwApi.format('*[ng-controller="{0}"]', controllerName)).removeAttr('ng-controller').removeAttr('ng-class').removeClass('ng-scope');
    };

    CwAngularLoader.prototype.removeController = function (controllerName) {
        $(cwApi.format('*[ng-controller="{0}"]', controllerName)).remove();
    };


    CwAngularLoader.prototype.saveTemplateInCacheAndLoadController = function (controllerName, $container, templatePath, controllerMethod, containerAction) {
        var that = this;

        function setTemplate(templateContent) {
            var $c = $(templateContent);
            $container[containerAction]($c);
            that.loadController(controllerName, $c, controllerMethod);
        }
        if (templatesCache[templatePath] === undefined) {
            $.get(templatePath, function (templateContent) {
                templatesCache[templatePath] = templateContent;
                return setTemplate(templateContent);
            }).fail(function (err, a, b) {
                cwApi.Log.Error(err, a, b);
            });
        } else {
            setTemplate(templatesCache[templatePath]);
        }
    };

    CwAngularLoader.prototype.loadControllerAndAppendTemplate = function (controllerName, $container, templatePath, controllerMethod) {
        if ($container.find(cwApi.format('*[ng-controller="{0}"]', controllerName)).length > 0) {
            return;
        }
        this.saveTemplateInCacheAndLoadController(controllerName, $container, templatePath, controllerMethod, 'append');
    };

    CwAngularLoader.prototype.loadControllerWithTemplate = function (controllerName, $container, templatePath, controllerMethod) {
        return this.saveTemplateInCacheAndLoadController(controllerName, $container, templatePath, controllerMethod, 'html');
    };

    CwAngularLoader.prototype.prefixWithTemplatePath = function (moduleName, templateName) {
        var templatePath = cwApi.format('{0}/ngTemplates/{1}.ng.html', moduleName, templateName);
        if (cwApi.isDebugMode()) {
            return cwApi.format('{0}/{1}', cwApi.getDebugModulePath(), templatePath);
        }
        return cwApi.format('{0}modules/{1}', cwApi.getCommonContentPath(), templatePath);
    };

    CwAngularLoader.prototype.registerEditableScope = function ($scope) {
        this.editableScopes[$scope.$id] = $scope;
    };

    CwAngularLoader.prototype.applyScopeForEditMode = function () {
        var scopeId, $scope;
        for (scopeId in this.editableScopes) {
            if (this.editableScopes.hasOwnProperty(scopeId)) {
                $scope = this.editableScopes[scopeId];
                $scope.$apply(function () {
                    if ($scope.goToEditMode) {
                        $scope.goToEditMode();
                    } else {
                        $scope.isEditMode = true;
                    }
                });
            }
        }
    };

    CwAngularLoader.prototype.cleanEditableScopes = function () {
        this.editableScopes = {};
    };

    CwAngularLoader.prototype.getDirectiveTemplatePath = function (customFolder, templateName) {
        if (cwApi.isDebugMode()) {
            return cwApi.format('/libs-debug/custom/{0}/libs/ngDirectives/{1}/{1}.ng.html', customFolder, templateName);
        }
        return cwApi.format('{0}/html/{1}/{1}.ng.html', cwApi.getCommonContentPath(), templateName);
    };

    CwAngularLoader.prototype.getLayoutTemplatePath = function (customFolder, layoutName, templateName) {
        if (cwApi.isDebugMode()) {
            return cwApi.format('/libs-debug/custom/{0}/libs/cwLayouts/{1}/{2}.ng.html', customFolder, layoutName, templateName);
        }
        return cwApi.format('{0}/html/{1}/{2}.ng.html', cwApi.getCommonContentPath(), layoutName, templateName);
    };

    CwAngularLoader.prototype.getBehaviourTemplatePath = function (behaviourName, templateName) {
        if (cwApi.isDebugMode()) {
            return cwApi.format('/libs-debug/libs/cwBehaviours/{0}/{1}.ng.html', behaviourName, templateName);
        }
        var templatePath = cwApi.format('{0}/{1}.ng.html', behaviourName, templateName);
        return cwApi.format('{0}modules/{1}', cwApi.getCommonContentPath(), templatePath);
    };

    CwAngularLoader.prototype.getPluginTemplatePath = function (pluginName, templateName) {
        if (cwApi.isDebugMode()) {
            return cwApi.format('/libs-debug/libs/cwAPI/cwPluginManager/CwPlugins/{0}/{1}.ng.html', pluginName, templateName);
        }
        return cwApi.format('{0}/html/{1}/{2}.ng.html', cwApi.getCommonContentPath(), pluginName, templateName);
    };

    cwApi.CwAngularLoader = new CwAngularLoader();
    cwApi.CwAngularLoaderHelper = ngHelper;

}(cwAPI, jQuery));