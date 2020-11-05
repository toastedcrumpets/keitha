#!/usr/bin/python3
from aiohttp import web
import socketio

debug=False

#######################################################
############         SERVER                 ###########
#######################################################

#Remove the cors_allowed_origins below when in production
sio = socketio.AsyncServer(cors_allowed_origins='*', always_connect=True)
app = web.Application()
sio.attach(app)

#All state is maintained by the server. The webpage cache's its local
#copy but the authority is the server. State is broken up into control
#state, buffer state, and readings
conf_state = {
    'triggerMode':0,
}

buf_state = {
    'sum':0,
    'sum_sq':0,
    'min':1e300,
    'max':-1e300,
}

readings_state=[]

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
        print("Subscripe conf ", sid)
    #On subscription, broadcast the full state
    sio.enter_room(sid, 'conf_state')
    await sio.emit('conf_state_update', conf_state, to=sid)

@sio.event    
async def conf_state_update(sid, payload):
    if debug:
        print("conf update ", sid, payload)
    conf_state.update(payload)
    await sio.emit('conf_state_update', payload, room='conf_state')

########### Buffer state
@sio.event
async def buf_state_sub(sid):
    if debug:
        print("Subscripe buf ", sid)
    #On subscription, broadcast the full state
    sio.enter_room(sid, 'buf_state')
    await sio.emit('buf_state_update', buf_state, to=sid)

@sio.event    
async def buf_state_update(sid, payload):
    if debug:
        print("buf update ", sid, payload)
    buf_state.update(payload)
    await sio.emit('buf_state_update', payload, room='buf_state')

########### Readings state
@sio.event
async def readings_state_sub(sid):
    if debug:
        print("Subscripe readings ", sid)
    #On subscription, broadcast the full state
    sio.enter_room(sid, 'readings_state')
    await sio.emit('readings_state_update', readings_state, to=sid)

@sio.event    
async def readings_state_add(sid, payload):
    if debug:
        print("Readings add", sid, payload)
    #Add the readings
    readings_state.extend(payload)
    await sio.emit('readings_state_add', payload, room='readings_state')
    #Update the readings status
    values = list(map(lambda x : x[1], payload))
    buf_state['min'] = min(buf_state['min'], min(values))
    buf_state['max'] = max(buf_state['max'], max(values))
    buf_state['sum'] += sum(values)
    buf_state['sum_sq'] += sum(map(lambda x : x[1]*x[1], payload))
    await sio.emit('buf_state_update', buf_state, room='buf_state')

@sio.event    
async def readings_state_update(sid, payload):
    if debug:
        print("Readings update", sid, payload)
    readings_state = payload
    
    
    await sio.emit('readings_state_update', readings_state, room='readings_state')
    
app.router.add_static('/', 'build')

#######################################################
############         STARTUP                ###########
#######################################################

if __name__ == '__main__':
    web.run_app(app, port=8080)
