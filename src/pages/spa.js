//spa.js



console.log(window.location.href);
var app = angular.module("kanban", ['ngRoute', 'ui.bootstrap','nvd3']);


app.component ("datePicker",{
    template: ` <p class="input-group">
                    <input type="text" class="form-control" datepicker-popup="yyyy-MM-dd" ng-model="$ctrl.dt"  
                    ng-change="$ctrl.dateChanged()" is-open="$ctrl.opened" min-date="$ctrl.start" 
                    max-date="$ctrl.today" ng-required="true" close-text="Close" />
                    <span class="input-group-btn">
                        <button type="button" class="btn btn-default" ng-click="$ctrl.open($event)"><i class="glyphicon glyphicon-calendar"></i></button>
                    </span>
                 </p>`,
    bindings:{
        dt: '=',
        dateChanged:'&',
        minDate: '<'
    },

    controller: function(){
        self = this
        self.today = new Date();
        
        
        
        self.open = function ($event) {
            $event.preventDefault();
            $event.stopPropagation();
            self.opened = true;
        };

        
 
    }
});

app.component("quickfilters",{
      template: `<span><strong>{{$ctrl.boardName}}</strong> Filters: | </span>
                 <span ng-repeat="filter in $ctrl.filters"> {{filter}} | </span>
                `,
      bindings:{
          boardData:'<'
      },
      controller: function(){
         var self =this;
         self.filters= [];
         self.boardName = "(jiraBoard)";
         self.$onChanges = function (changes) {
                if (changes.boardData) {
                    let boardData = changes.boardData.currentValue;
                    if(boardData){
                        self.boardData = boardData
                        self.filters = boardData.getActiveQuickfilters();
                        self.boardName = self.boardData.boardName;
                    }
                    
                }
          };  
      }
  });
 
 app.component("download",{
      template: ' <button type="button" class="btn btn-default navbar-btn" ng-click="$ctrl.asCSV()">CSV</button><button type="button" class="btn btn-default navbar-btn" ng-click="$ctrl.asJson()">JSON</button>',
      bindings: { 
          format: '&',
          filename: '@',
          data: '<'
      },
      controller: function(){
        var self =this;

        self.asCSV = function () {
          downloadAsCSV(format(self.data), self.filename);
        };

        self.asJson = function () {
            downloadAsJson(format(self.data), self.filename);
        };

        function format (){
            var data = self.data;
            if(self.format){
                data = self.format()(data);
            }
            return data;
        };

      }
  });

  app.component("cfdGraph",{
      template: '<nvd3 options="$ctrl.options" data="$ctrl.chartData" config="$ctrl.config" ></nvd3>',
      bindings: {
          data: '<',
          zero: '<'
      },
      controller: [ 'cfdFactory', function(cfd){
          var self = this;

          self.chartData; 
          this.$onChanges = function (changes) {
                if (changes.data) {
                    self.chartData = transform(changes.data.currentValue);
                }
          }; 
          
          function transform(data){
                if(data){
                    let cfdChartData = cfd.buildCfdChartData(data);
                    if (self.zero) {
                        cfdChartData = cfd.doneStartsFrom0(cfdChartData);
                    }
                    return cfdChartData;
                }
                return ;
                
          }

          self.options = {
                chart: {
                    type: 'stackedAreaChart',
                    height: 450,
                    margin : {
                        top: 20,
                        right: 20,
                        bottom: 30,
                        left: 40
                    },
                    x: function(d){return d[0];},
                    y: function(d){return d[1];},
                    useVoronoi: false,
                    clipEdge: true,
                    duration: 100,
                    useInteractiveGuideline: true,
                    xAxis: {
                        showMaxMin: false,
                        tickFormat: function(d) {
                            return d3.time.format('%Y-%m-%d')(new Date(d))
                        }
                    },
                    yAxis: {
                        rotateLabels: 45,
                        tickFormat: function(d){
                            return d3.format(',.0f')(d);
                        }
                    },
                    zoom: {
                        enabled: true,
                        scaleExtent: [1, 10],
                        useFixedDomain: false,
                        useNiceScale: false,
                        horizontalOff: false,
                        verticalOff: true,
                        unzoomEventType: 'dblclick.zoom'
                    }
                }
            };
        
        
          self.config = {
              refreshDataOnly: false, // default: true
          };
        
      }]
  });


app.component("spectralGraph",{
      template: '<nvd3 options="$ctrl.options" data="$ctrl.chartData" config="$ctrl.config" ></nvd3>',
      bindings: {
          data: '<',
      },
      controller: [ 'throughputFactory', function(throughput){
          var self = this;

          self.chartData;
          self.sum = 0; 
          this.$onChanges = function (changes) {
                if (changes.data) {
                    self.chartData = transform(changes.data.currentValue);
                }
          }; 
          
          function transform(data){
                if(data){
                    let chartData = [];
                    let spectralData = throughput.createContinousData(data);
                    chartData.push(throughput.generateDataStream("Done tickets"
                                                                ,"bar"
                                                                ,1
                                                                ,spectralData
                                                                ,[
                                                                        throughput.increaseIndexByOne
                                                                    ,throughput.transformToStream
                                                                ]));
                    chartData.push(throughput.generateDataStream("Percent"
                                                                ,"line"
                                                                ,2
                                                                ,spectralData
                                                                ,[
                                                                    throughput.transformToAccSum
                                                                    ,throughput.transformAccSumToAccPercentage
                                                                ]));
                    
                    self.sum = _.last(chartData[1].values).y;
                    return chartData;
                }
                return ;
                
          }

           self.options = {
            
            chart: {
                type: 'multiChart',
                height: 450,
                margin : {
                    top: 30,
                    right: 60,
                    bottom: 50,
                    left: 70
                },
                color: d3.scale.category10().range(),
                useInteractiveGuideline: true,
                duration: 500,
                xAxis: {
                    tickFormat: function(d){
                        return d3.format(',f')(d);
                    }
                },
                yAxis1: {
                    tickFormat: function(d){
                        return d3.format(',.0f')(d);
                    }
                },
                yAxis2: {
                    tickFormat: function(d){
                        return d3.format(',.0f')(d/self.sum*100);
                    }
                },

                //forceX:[0, 900]
                
            }
        };
        
        
          self.config = {
              refreshDataOnly: false, // default: true
          };
        
      }]
  });


app.component("throughputGraph",{
      template: '<nvd3 options="$ctrl.options" data="$ctrl.chartData" config="$ctrl.config" ></nvd3>',
      bindings: {
          data: '<',
          rollingAverage: '<'
      },
      controller: [ 'throughputFactory', function(throughput){
          var self = this;

          self.chartData;
          //self.sum = 0; 
          this.$onChanges = function (changes) {
                if (changes.data) {
                    self.chartData = transform(changes.data.currentValue);
                }
          }; 
          
          function transform(data){
                if(data){
                    let chartData = [];
                    let throughputData = data;
                    chartData.push(throughput.generateDataStream("Done tickets"
                                                                ,"bar"
                                                                ,1
                                                                ,throughputData
                                                                ,[
                                                                        throughput.increaseIndexByOne
                                                                    ,throughput.transformToStream
                                                                ]));
                    chartData.push(throughput.generateDataStream("rolling Avg"
                                                                ,"line"
                                                                ,1
                                                                ,throughputData
                                                                ,[
                                                                    throughput.rollingAverageTransformer( self.rollingAverage)
                                                                   ,throughput.transformToStream
                                                                ]));
                    
                    //self.sum = _.last(chartData[1].values).y;
                    return chartData;
                }
                return ;
                
          }

           self.options = {
            
            chart: {
                type: 'multiChart',
                height: 450,
                margin : {
                    top: 30,
                    right: 60,
                    bottom: 50,
                    left: 70
                },
                color: d3.scale.category10().range(),
                useInteractiveGuideline: true,
                duration: 500,
                xAxis: {
                    tickFormat: function(d) {
                        return d3.time.format('%Y-%m-%d')(new Date(d));
                    }
                },
                yAxis1: {
                    tickFormat: function(d){
                        return d3.format(',.0f')(d);
                    }
                }
            }
        };
        
        
          self.config = {
              refreshDataOnly: false, // default: true
          };
        
      }]
  });



app.factory("cfdFactory", function () {
    var factory = {};


    factory.filterCfdChartData = function (cfdRawChartData, start) {
        var filteredCfdData = [];
        _.forEach(cfdRawChartData, function (laneData) {
            var filteredLane = {};
            filteredLane.key = laneData.key;
            filteredLane.values = filterArray(laneData.values, function (value) {
                return value[0] >= start;
            });
            filteredCfdData.push(filteredLane);
        });
        return filteredCfdData;
    };

    factory.buildCfdChartData = function (cfdData) {
        var chartData = [];
        var lane, day;
        var laneData;
        console.log("buildCfdChartData");
        if (cfdData.length === 0) {
            return cfdData;
        }
        for (lane = 1; lane < cfdData[0].length; lane++) {
            laneData = {};
            laneData.key = cfdData[0][lane];
            laneData.values = [];
            for (day = 1; day < cfdData.length; day++) {
                laneData.values.push([cfdData[day][0], cfdData[day][lane]]);
            }
            chartData.push(laneData);
        }
        return chartData;
    };

    factory.readableDatesOnCfdData = cfdUtil.readableDatesOnCfdData;

    factory.doneStartsFrom0 = function (cfdChartData) {
        cfdChartData = _.cloneDeep(cfdChartData);
        var doneAccumulated = cfdChartData[0].values[0][1];
        _.forEach(cfdChartData[0].values, function (value) {
            value[1] = value[1] - doneAccumulated;
        });
        return cfdChartData;
    };

    return factory;
});


app.factory("boardDataFactory", function () {
    var factory = {};
    var data;
    var cfdUrl;
    var boardConfig; 

    factory.fetchApiData = function(){
       let message = {type:"getUrl"}
       
       
       return new Promise( 
           (resolve, reject) => {
                
                let eMPromise = sendExtensionMessage(message);
                eMPromise.then(response => {
                    cfdUrl = new CfdUrl(response);
                    
                    let configPromise =  sendRestRequest(cfdUrl.buildBoardConfigUrl());
                    let cfdDataPromise = sendRestRequest(cfdUrl.buildUrl());
                    return Promise.all([configPromise,cfdDataPromise]);
                }).then( response =>{
                        let boardConfig = _.first(response);
                        let cfdData = _.last(response)
                        boardData = new BoardData();
                        boardData.registerCfdApiResponce(cfdData);
                        boardData.registerBoardConfig(boardConfig);
                        boardData.registerCfdUrl(cfdUrl);
                        resolve(boardData);
                    }
                );

                          
            });
    };
    
    factory.getBoardData = function (url) {
         return new Promise(function (resolve, reject) {
             if(data){
                 resolve(data);
             }else{
                //sendRestRequest(url).then(function(response){
                //    data = CfdApiResponceParser().parse(response);
                //    resolve(data);
                factory.fetchApiData().then(boardData =>  {
                    data = boardData;
                    resolve(data)
                },function(error){
                    reject();
                });
             }
        });
    };
         
    return factory;
});

app.factory("sharedState",function(){
    var state = {
        "startTime": new Date().getTime()-365*timeUtil.MILLISECONDS_DAY,
    }
    return state;
});

app.controller("SpectralController", 
                [
                    '$scope', 
                    '$route', 
                    '$window', 
                    '$routeParams', 
                    'boardDataFactory', 
                    'throughputFactory',
                    "sharedState"
                   , function ($scope, $route, $window, $routeParams, boardDataFactory, throughput,state) {
      console.log ("SpectralController");
     let sum;
     $scope.data ;
     $scope.hasData = true;
     $scope.dt = new Date(state.startTime)||new Date();

    function updateReport(){
        
        boardDataFactory.getBoardData().then(function(boardData){
            let spectralData;
            $scope.boardData = boardData;
            let filter = {
                "starttime": state.startTime,
                "resolution": $scope.resolution.value*timeUtil.MILLISECONDS_DAY
            }
            $scope.spectralData = boardData.getSpectralAnalysisReport(filter);
            $scope.hasData = true;
            $scope.$apply();
        },function(reject){});
    }

    
    $scope.startDateChanged = function () {

        console.log("In:" + $scope.dt);
        if(!new Date($scope.dt)){
            return;
        }
        state.startTime = new Date($scope.dt).getTime();
        updateReport();
    };


    $scope.resolutions = [
        {value:1, label:"1 day"},
        {value:7, label:"1 week"},
        {value:14, label:"2 weeks"},
        {value:21, label:"3 weeks"},
        {value:30, label:"1 month"}
    ]

    $scope.resolution =  $scope.resolutions[state.resolution||0];
    
    $scope.updateResolution = function() {
        if($scope.resolution){
            updateReport();
            state.resolution =_.indexOf($scope.resolutions,$scope.resolution);
        } 
    };

    updateReport();
}]);





//******************************************************************************************
// Throughput
//******************************************************************************************

app.factory("throughputFactory", function () {
    var factory= {};
    factory.generateChartData = function (data){
        return [{
            "key" : "Troughput" ,
            "bar": true,
            "values" : _.drop(data)
        }];
    };

    factory.generateDataStream = function (key,type,yAxis, data, transform){
        let result = _.drop(_.clone(data));
        if(!_.isArray(transform)){
            transform = [transform];
        }

        //console.log("original data =" + JSON.stringify(result));
        
        transform.forEach( function(trans){
            result = result.map(trans);
        });

        //console.log("transformed data =" + JSON.stringify(result));

        return {
            "key" : key ,
            "type": type,
            "yAxis":yAxis,
            "values" :result
        };
    };

    factory.createContinousData = function(data){
        let header = data.shift();
        let max = _.last(data)[0];
        let grid = gridOf(0,max,2);

        grid = grid.map(function(item,index){
            return [index,0];
        });

        data.forEach(function(item){
            grid[item[0]]=item;
        });
        grid.unshift(header);
        return grid;
    }

    factory.transformToStream = function(pair){
        return{x:parseInt(pair[0]),y:pair[1]};
    }

    factory.increaseIndexByOne = function(pair){
        return [pair[0]+1,pair[1]];
    }

    var sum;

    factory.transformToAccSum = function(pair,index){
        if(index === 0){
            sum = 0
        }
        sum += pair[1];
        return{x:parseInt(pair[0]),y:sum};
    }

    factory.rollingAverageTransformer = function(over){
        
        return function(value,index,arr){
            let sum = 0;
            let samples = 0;
            let avg; 
            for(let i=index-(over-1);i<=index;i++){
                if(i>=0){
                    sum += _.last(arr[i]);
                    samples++;
                }
            }
            avg = Math.floor(100*sum/samples)/100;
            console.log("sum/samples=avg =" + sum +"/"+ samples +"=" + avg);
            return [_.first(value),avg];
        }
    }

    

    

    factory.transformAccSumToAccPercentage = function(value,index,arr){
        if(index === 0){
            sum = _.last(arr).y;
        }
        return{x:value.x,y:Math.floor(value.y/sum*100)};
    }



     
    return factory;
});


// ThroughputController ----------------------------------------------------------------------

app.controller("ThroughputController", 
                ['$scope', '$route', '$window', '$routeParams', 'boardDataFactory', 'throughputFactory','sharedState',"cfdFactory"
                , function ($scope, $route, $window, $routeParams, boardDataFactory, throughput,state,cfd) {
      console.log ("ThroughputController");
     $scope.data ;
     $scope.rollingAverage = 3;
     $scope.today = new Date();
     $scope.hasData = false;
     $scope.state = state;
     $scope.dt = new Date(state.startTime)||new Date();
     $scope.dlFormat = cfd.readableDatesOnCfdData;

    
    function updateReport(){
        
        boardDataFactory.getBoardData($scope.board).then(function(boardData){
            $scope.state.startTime = new Date($scope.dt).getTime();
            console.log($scope.dt)
            $scope.boardData = boardData;
            var filter = {
                sampleTimes: cfdUtil.generateSampleTimes( 
                    $scope.state.startTime,$scope.sprintLength.value)
            };
             
            $scope.reportData = boardData.getThroughputReport(filter);;
            $scope.hasData = true;
            $scope.$apply();
            console.log($scope.dt)
        },function(reject){});
    }

    $scope.startDateChanged = function () {
        
        updateReport();
    };


    $scope.sprintLengths = [
        {"value":1,"label":"1 week"},
        {"value":2,"label":"2 weeks"},
        {"value":3,"label":"3 weeks"},
        {"value":4,"label":"4 weeks"},
    ]

    $scope.state.sprintLength = $scope.state.sprintLength || 0; 
    $scope.sprintLength = $scope.sprintLengths[$scope.state.sprintLength];
    
    $scope.updateSprintLength = function() {
        if($scope.sprintLength){
            $scope.state.sprintLength = _.indexOf($scope.sprintLengths,$scope.sprintLength)
            updateReport();
        } 
    };

    updateReport();
}]);



//******************************************************************************************
// CFD
//******************************************************************************************




app.controller("CfdController", ['$scope', '$route', '$window', '$routeParams', 'boardDataFactory', 'cfdFactory','sharedState', function ($scope, $route, $window, $routeParams, boardDataFactory, cfd,state) {

    $scope.cfdData = [{"key" : "No data" , "values" : [ [ 0 , 0]]}];
    $scope.dt = new Date();
    $scope.hasData = false;
    $scope.startTime = 0;
    $scope.zeroDone = false;
    
    
    console.log("cfdController");

    //download.setup($scope,"cfdData",cfd.readableDatesOnCfdData);
    $scope.dlFormat = cfd.readableDatesOnCfdData;

    function updateCfd() {
        setTimeout(()=>{
            var filter = getFilterParameters();
            $scope.cfdDataTable = $scope.boardData.getCfdData(filter);
            if ($scope.cfdDataTable.length === 0) {
                return;
            }
            $scope.hasData = true;
            console.log($scope.dt);
             $scope.$apply();
        },50)
        
        
   }
    
   

    function getFilterParameters(){
        var parameters = {};
        if(new Date($scope.dt).getTime() !== $scope.start){
            parameters.startMilliseconds = new Date($scope.dt).getTime();
        }
        return parameters;
    }

    $scope.startDateChanged = function () {
        console.log($scope.dt);
        updateCfd();
    };

    boardDataFactory.getBoardData().then(function (response) {
        $scope.boardData = response;
        $scope.dt = new Date(parseInt(response.boardCreated));
        updateCfd();
        //$scope.$apply();
    }, function (error) {
        console.log("send message failed");
    });

    $scope.$on('$viewContentLoaded', function (event) {
        $window._gaq.push(['_trackPageview', "CFD"]);
    });

}]);


app.controller("TabController", [
        '$scope',
        '$location',
        '$routeParams',
        function ($scope, $location,$routeParams) {
            $scope.tabs = [];
            $scope.tabs.push({"caption": "CFD", "active": false, "route": "/cfd/"});
            $scope.tabs.push({"caption": "Throughput", "active": false, "route": "/throughput/"});
            $scope.tabs.push({"caption": "Spectral", "active": false, "route": "/spectral/"});

            
            $scope.setActiveTab = function (url) {
                _.forEach($scope.tabs, function (tab) {
                    if (url.indexOf(tab.route) > -1) {
                        tab.active = true;
                        return;
                    }
                    tab.active = false;
                });
            };

            $scope.goTo = function (route) {
                $location.url(route + $routeParams.board + "/" + $routeParams.id);
                $scope.setActiveTab($location.url())
                $scope.boardUrl = _.last($location.url().split("/"));
            };

            $scope.setActiveTab($location.url());
        }
    ]
);



app.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.
            when('/cfd/:board/:id', {
               templateUrl: 'templates/cumulative-flow-diagram.html',
               controller: 'CfdController'
            }).when('/throughput/:board/:id', {
                templateUrl: 'templates/throughput.html',
                controller: 'ThroughputController'
            }).when('/spectral/:board/:id', {
                templateUrl: 'templates/spectral.html',
                controller: 'SpectralController'
            })/*.when('/flowreport/:board', {
                templateUrl: 'templates/flowreport.html',
                controller: 'FlowReportController'
            }).when('/cycletime/:board', {
                templateUrl: 'templates/cycletime.html',
                controller: 'CycletimeController'
            })*/.otherwise({
                redirectTo: '/cfd/:board/:id'
            });
    }
]);
