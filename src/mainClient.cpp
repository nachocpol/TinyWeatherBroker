// Windows crap
#undef UNICODE
#define WIN32_LEAN_AND_MEAN
#include "Windows.h"
#include "winsock2.h"
#include <ws2tcpip.h>

#include "stdio.h"

struct ClientState
{
    WSAData m_WSAData;
    SOCKET m_Socket;
}g_State;

bool Initialize();
void Update();

int main()
{
    if(!Initialize())
    {
        return 1;
    }

    while(true)
    {
        Update();
    }
    return 0;
}

bool Initialize()
{
    // Init WSA system
    int result = WSAStartup(MAKEWORD(2,2), &g_State.m_WSAData);
    if(result != 0)
    {
        printf("ERROR[%i]: Failed to initialize WSA! \n", result);
        return false;
    }

    g_State.m_Socket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (g_State.m_Socket == INVALID_SOCKET) 
    {
        printf("[ERROR:%i]: Failed to create the socket", WSAGetLastError());
        return false;
    }
    
    sockaddr_in connectionInfo;
    connectionInfo.sin_family = AF_INET;
    connectionInfo.sin_addr.S_un.S_addr = inet_addr("127.0.0.1");
    connectionInfo.sin_port = htons(1122);

    result = connect(g_State.m_Socket, (SOCKADDR*)&connectionInfo, sizeof(connectionInfo));
    if(result == SOCKET_ERROR)
    {
        printf("[ERROR:%i]: Failed to connect to the server \n", WSAGetLastError());
        return false;
    }

    printf("[INFO]: Connected to the server \n");

    char buf[] = "Hello mr server";
    result = send(g_State.m_Socket, buf, strlen(buf), 0);

    char recBuf[512];
    result = recv(g_State.m_Socket, recBuf, 512, 0);
    if(result > 0)
    {
        printf("[INFO]: Reply from server: %s \n", recBuf);
    }
    
    closesocket(g_State.m_Socket);
    WSACleanup();
    
    return true;
}

void Update()
{
}