pin_status_tpl = '''
<!DOCTYPE html>
<html>
    <head> <title>ESP8266 Pins</title> </head>
    <p>Available RAM: {ram} </table>
    <body> <h1>ESP8266 Pins</h1>
        <table border="1"> <tr><th>Pin</th><th>Value</th></tr> {} </table>
    </body>
</html>
'''

pin_data_tpl = '''
<tr>
    <td>{pin}</td>
    <td>{val}</td>
</tr>
'''

dir_list_tpl = '''
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <title>Index of {cwd}</title>
    </head>
    <body>
        <h1>Index of {cwd}</h1>
        <table style='text-align: center'>
            <tr><th>Filename</th><th>Filesize</th></tr>
            {}
        </table>
    </body>
</html>
'''

table_data_tpl = '''
<tr>
    <td><a href='{path}'>{filename}</a></td>
    <td>{filesize}K</td>
</tr>
'''


import os
import machine
import socket
import gc


class Request():
    """Request received from the client.
    data -- Received data in bytes
    """

    def __init__(self, data):
        lines = [d.strip() for d in data.decode('utf-8').split('\r\n')]
        self.boundary = 'NoBoundAry'
        try:
            print(lines[0])
            self.method, self.raw_path, self.version = lines[0].split(' ')
            self.path = self.raw_path.split('?', 1)[0]
            self.headers = {k: v for k, v in
                            (l.split(': ') for l in lines[1:-2])}
            self.host = self.headers['Host']
        except ValueError as e:
            self.method = None
            self.path = None
            self.headers = None
            self.host = None
            print('ERROR:', e)


def get_dirs(path='/'):
    """Get HTML formated dirlist."""
    dirs = os.listdir(path)
    data = []
    for d in dirs:
        p = path + d
        data.append({'path': p,
                     'filesize': round(os.stat(p)[6] / 1024, 2),
                     'filename': d})
    table_html = '\r\n'.join([table_data_tpl.format(**d)
                              for d in data])
    return dir_list_tpl.format(table_html, cwd=path)


def get_file(path):
    """Get raw file data."""
    with open(path) as f:
        return f.read()


def get_status():
    """Get HTML formated ram and pins status."""
    pins = [machine.Pin(i, machine.Pin.IN) for i in (0, 2, 4, 5, 12, 13, 14, 15)]
    pins_html = '\r\n'.join([pin_data_tpl.format(pin=str(p), val=p.value()) for p in pins])
    return pin_status_tpl.format(pins_html, ram=gc.mem_free())


# init socket
addr = socket.getaddrinfo('0.0.0.0', 80)[0][-1]
s = socket.socket()
s.bind(addr)
s.listen(1)
print('listening on', addr)

# start server loop
while True:
    client, infos = s.accept()
    head = client.recv(1024)
    request = Request(head)
    response = ''
    if request.method:
        print(infos, request.method, request.path)
        p = request.path
        if p == '/':
            response = get_dirs()
        elif p == '/status':
            response = get_status()
        else:
            dirs = os.listdir()
            if p[1:] in dirs:
                response = get_file(p)
            else:
                response = 'file not found'
    client.send(response)
    client.close()
