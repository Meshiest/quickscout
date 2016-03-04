require 'sinatra'
require 'open-uri'
require 'json'

#THE STAGING SERVER IS AVAILABLE AT: https://frc-staging-api.firstinspires.org
#THE PRODUCTION SERVER IS AVAILABLE AT: https://frc-api.firstinspires.org
$server = 'https://frc-api.firstinspires.org/v2.0/'+Time.now.year.to_s+'/'

$token = open('frcapi').read

set :bind, '0.0.0.0'
set :port, 8092


def api path
  return `curl #{$server}#{path} -H "Authorization: Basic #{$token}" -H "accept: application/json"`
end


get %r{^\/api\/.*$} do
  puts request.path[5...-1]
  headers['Content-Type'] = 'application/json'
  api(request.path[5...-1])
end

$events = api('events/')

get '/events' do
  headers['Content-Type'] = 'application/json'
  $events
end

get '/' do
  erb :index
end

post '/match' do
  begin
    data = JSON.parse(params[:scout] || '')
    open('data/'+data['match']+"_"+data['teamNumber'].to_s+".json",'w'){|f|
      f << params[:scout]
    }
    '{"msg":"Success"}'
    status 200
  rescue => e
    puts e
    status 403
  end

end

post '/pit' do
  begin
    data = JSON.parse(params[:scout] || '')
    open('data/pit_'+data['main']['teamNumber'].to_s+".json",'w'){|f|
      f << params[:scout]
    }
    '{"msg":"Success"}'
    status 200
  rescue => e
    puts e
    status 403
  end

end