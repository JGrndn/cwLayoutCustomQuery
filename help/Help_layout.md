# Description
This layout allows users to set up their own filters when displaying list of objects. It can also be used so they can display charts.

# Installation  
[https://github.com/casewise/cpm/wiki](https://github.com/casewise/cpm/wiki)  
Please also note that you need to update an Evolve js file to prevent some errors to be raised :  
add the following modules to the Angular loader, located in the **webdesigner/libs/cwAPI/CwAngular/CwAngularLoader.js** file :  
* ui.bootstrap
* chart.js  

To do so, replace ```app = angular.module(cwAppName, ['ngDraggable', 'cfp.hotkeys', 'localytics.directives', 'ngSanitize', 'ngAnimate', 'xeditable']);``` by ```app = angular.module(cwAppName, ['ngDraggable', 'cfp.hotkeys', 'localytics.directives', 'ngSanitize', 'ngAnimate', 'xeditable', 'ui.bootstrap', 'chart.js']);```


# How to set up
Create the following structure :

<img src="https://github.com/JGrndn/cwLayoutCustomQuery/blob/master/screen/1.JPG" style="width:95%" />  

_To make a property available in the filters in the user interface, you just need to check it on the ObjectType node._  


## Result  
Below is a screenshot of what you get once your layout is deployed.  
<img src="https://github.com/JGrndn/cwLayoutCustomQuery/blob/master/screen/2.JPG" style="width:95%" />  

