Rails.application.routes.draw do
  root 'application#root'

  get '/test', to: 'application#test'

  get '/importantEndpoint', to: 'application#important_endpoint'
  match '/getSampled', to: 'application#get_sampled', via: [:get, :post]
end
