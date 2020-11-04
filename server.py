#!/usr/bin/python3
from aiohttp import web
import socketio


#######################################################
############         SERVER                 ###########
#######################################################

#Remove the cors_allowed_origins below when in production
sio = socketio.AsyncServer(cors_allowed_origins='*', always_connect=True)
app = web.Application()
sio.attach(app)

#This is the "state" of the backend. The server broadcasts changes to
#the state but also keeps an up to date copy, so that new clients can
#get the current state.
status = {
    'triggerMode':0,
    'readings':[]
}

#On connect we send the status of the system to the client
@sio.event
async def connect(sid, environ):
    await sio.emit('status_change', status, to=sid)
    print("connect ", sid)

#Don't need to do anything on disconnect
@sio.event
def disconnect(sid):
    print('disconnect ', sid)

#Any status change is a dictionary that is "update"d to allow partial
#updates.
@sio.event
async def status_change(sid, payload):
    print('Server status_change', payload)
    status.update(payload)
    await sio.emit('status_change', payload)
    
#The worker will send 'reading' events, we just forward them on to
#everyone else
@sio.event
async def reading(sid, value):
    await sio.emit('reading', value, broadcast=True, include_self=False)
    
app.router.add_static('/', 'build')

#######################################################
############         STARTUP                ###########
#######################################################

if __name__ == '__main__':
    web.run_app(app, port=8080)
