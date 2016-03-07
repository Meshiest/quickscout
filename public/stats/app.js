(function(){


var app = angular.module('app', ['ngRoute', 'ngMaterial', 'ngCookies']);

app.config(function($routeProvider, $mdThemingProvider){

  $mdThemingProvider.theme('default').
    primaryPalette('indigo', {
      'default': '500',
      'hue-1': '50'
    }).accentPalette('red', {
      'default': '700'
    })

  $mdThemingProvider.setDefaultTheme('default')

  $routeProvider.
  when('/', {
    redirectTo: '/overview'
  }).
  when('/overview',{
    templateUrl: 'stats/_overview.html',
    controller: 'OverviewCtrl'
  }).
  when('/team/:id', {
    templateUrl: 'stats/_team.html',
    controller: 'TeamCtrl'
  }).
  otherwise({ redirectTo: '/overview' })

});

app.controller('AppCtrl', function($mdSidenav, $scope, $location, $http, $cookies) {
  $scope.toggleSideNav = function(menuId) {
    $mdSidenav(menuId).toggle();
  };

  $scope.menu = [
    {
        title: 'Overview',
        icon: 'dashboard',
        path: '/overview'
    },
    /*{ // to be re-implemented when the time comes
        title: 'Pit Scout',
        icon: 'create',
        path: '/scout/pit'
    },
    {
        title: 'Match Scout',
        icon: 'add',
        path: '/scout/match'
    },
    {
        title: 'Edit Match',
        icon: 'assignment',
        path: '/editmatch'
    }*/
  ];

  $scope.setPath = function(path) {
      $location.path(path)
  }

  $scope.teams = {}
  $scope.lastMatch = 0
  $scope.tournament = {}
  $scope.numMatches = 0
  $scope.matchKeys = []
  $scope.matchKeyTypes = {}
  $scope.numTeams = 0
  $scope.eventCode = $cookies.get('eventCode') || '' //'txsa'

  $scope.updateTeams = function(){

    $http.get('/api/matches/'+$scope.eventCode+'/').success(function(data){
      $scope.tournament.matches = data.Matches

      //$scope.numMatches = Object.keys($scope.tournament.matches).length
      //$scope.numTeams = Object.keys($scope.tournament.teams).length
    })

    $http.get('/data').success(function(data){
      $scope.scoutedFiles = data
      $scope.numMatches = 0
      $scope.numTeams = 0
      data.forEach(function(filename){
        console.log(filename + " pit?: " + filename.startsWith('/data/pit_'))
        if(filename.startsWith('/data/pit_'))
          $scope.numTeams ++;
        else
          $scope.numMatches ++;
      })
      console.log(data)
    })

    /*$http.get('teams.php').success(function(data){

      console.log("Got teams")
      
      data.teams.forEach($scope.handleTeam)
    })*/
  }


  $scope.updateTeams();

});


app.controller('OverviewCtrl', function($scope, $location, $mdToast, $cookies, $http) {

  $scope.lastMatchData = []
  $scope.numScoutedTeams = 0

  $scope.updateEventCode = function() {
    $http.get('/api/matches/'+$scope.eventCode+'/').success(function(resp){
      $cookies.put('eventCode', $scope.eventCode)
      location.reload()
    }).error(function(){
       $mdToast.show($mdToast.simple().textContent("Bad Event Code"));
    })
  }

  $scope.updateMatchData = function() {
    //$scope.lastMatchData = $scope.getLastMatch()
    $scope.numScoutedTeams = Object.keys($scope.teams).length
    console.log('updated')
  }

  $scope.$on('updateTeams', $scope.updateMatchData)
  if(!$scope.lastMatchData.length) {
    //$scope.updateMatchData();
  }

  /*$scope.pie = {
    type: 'PieChart'
  }

  $scope.pie.data = {"cols": [
        {id: "t", label: "Topping", type: "string"},
        {id: "s", label: "Slices", type: "number"}
    ], "rows": [
        {c: [
            {v: "Mushrooms"},
            {v: 3},
        ]},
        {c: [
            {v: "Olives"},
            {v: 31}
        ]},
        {c: [
            {v: "Zucchini"},
            {v: 1},
        ]},
        {c: [
            {v: "Pepperoni"},
            {v: 2},
        ]}
    ]};

    $scope.pie.options = {
        'legend': 'none'
    };*/

});

app.controller('TeamCtrl', function($scope, $routeParams, $location){
  console.log($routeParams.id)
  $scope.teamNumber = $routeParams.id
});


})();
