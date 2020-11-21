#!/usr/bin/python3
from aiohttp import web

from common import *

#######################################################
############         SERVER                 ###########
#######################################################

#Remove the cors_allowed_origins below when in production
sio = socketio.AsyncServer(cors_allowed_origins='*', always_connect=True)
app = web.Application()
sio.attach(app)

buf_state = {
    'sum':0,
    'sum_sq':0,
    'min':1e300,
    'max':-1e300,
}

readings_state= [ [], [] ]

########### Connections/Disconnections
@sio.event
async def connect(sid, environ):
    if debug:
        print("connect ", sid)

@sio.event
async def disconnect(sid):
    #Remove client from all rooms
    for room in sio.rooms(sid):
        sio.leave_room(sid, room)
    if debug:
        print('disconnect ', sid)

########### Configuration state
@sio.event
async def conf_state_sub(sid):
    if debug:
        print("Subscribe conf ", sid)
    #On subscription, broadcast the full state
    sio.enter_room(sid, 'conf_state')
    await sio.emit('conf_state_update', conf_state, to=sid)

@sio.event    
async def conf_state_update(sid, payload):
    global conf_state
    if debug:
        print("conf update ", sid, payload)
    conf_state = deep_update(conf_state, payload)
    await sio.emit('conf_state_update', payload, room='conf_state')

########### Buffer state
@sio.event
async def buf_state_sub(sid):
    if debug:
        print("Subscribe buf ", sid)
    #On subscription, broadcast the full state
    sio.enter_room(sid, 'buf_state')
    await sio.emit('buf_state_update', buf_state, to=sid)

@sio.event    
async def buf_state_update(sid, payload):
    global buf_state
    if debug:
        print("buf update ", sid, payload)
    buf_state = deep_update(buf_state, payload)
    await sio.emit('buf_state_update', payload, room='buf_state')

########### Readings state
@sio.event
async def readings_state_sub(sid):
    if debug:
        print("Subscribe readings ", sid)
    #On subscription, broadcast the full state
    sio.enter_room(sid, 'readings_state')
    await sio.emit('readings_state_update', readings_state, to=sid)

@sio.event    
async def readings_state_add(sid, payload):
    global readings_state, buf_state
    if debug:
        print("Readings add", sid, payload)
    #Add the readings
    readings_state[0].extend(payload[0])
    readings_state[1].extend(payload[1])
    await sio.emit('readings_state_add', payload, room='readings_state')
    #Update the readings status
    buf_state['min'] = min(buf_state['min'], min(payload[1]))
    buf_state['max'] = max(buf_state['max'], max(payload[1]))
    buf_state['sum'] += sum(payload[1])
    buf_state['sum_sq'] += sum(map(lambda x : x * x, payload[1]))
    await sio.emit('buf_state_update', buf_state, room='buf_state')

@sio.event    
async def readings_state_update(sid, payload):
    if debug:
        global readings_state
        print("Readings update", sid, payload)
    
    readings_state = payload
    await sio.emit('readings_state_update', readings_state, room='readings_state')
    #Update the readings status
    if len(payload[1]):
        buf_state['min'] = min(payload[1])
        buf_state['max'] = max(payload[1])
    else:
        buf_state['min'] = 1e300
        buf_state['max'] = -1e300
        
    buf_state['sum'] = sum(payload[1])
    buf_state['sum_sq'] = sum(map(lambda x : x*x, payload[1]))
    await sio.emit('buf_state_update', buf_state, room='buf_state')    
    
app.router.add_static('/', 'build')

#######################################################
############         STARTUP                ###########
#######################################################

if __name__ == '__main__':
    web.run_app(app, port=8080)
