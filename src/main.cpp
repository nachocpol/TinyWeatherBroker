#include "Packet.h"

// Windows crap
#undef UNICODE
#define WIN32_LEAN_AND_MEAN
#include "Windows.h"
#include "winsock2.h"
#include <ws2tcpip.h>

#include "stdio.h"
#include "stdint.h"

#include "queue"

enum ClientState : uint8_t
{
    UNINITIALIZED = 0,
    ACTIVE,
    CLOSING
};

struct Client
{
    Client() : m_State(ClientState::UNINITIALIZED) {}
    SOCKET m_Socket;
    ClientState m_State;
};

const uint32_t k_MaxClients = 64;

struct ServerState
{
    WSAData m_WSAData;
    SOCKET m_ServerSocket;
    Client m_Clients[k_MaxClients];
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
        Sleep(50);
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

    addrinfo hints = {};
    hints.ai_family = AF_INET;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_protocol = IPPROTO_TCP;
    hints.ai_flags = AI_PASSIVE;

    // Server addr info
    addrinfo* serverAddr = NULL;
    result = getaddrinfo(NULL, "1122", &hints, &serverAddr);
    if(result != 0)
    {
        printf("ERROR[%i]: Failed to resolve server addr \n", WSAGetLastError());
        return false;
    }

    g_State.m_ServerSocket = socket(serverAddr->ai_family, serverAddr->ai_socktype, serverAddr->ai_protocol);
    if(g_State.m_ServerSocket == INVALID_SOCKET)
    {
        printf("ERROR[%i]: Failed to create the server socket\n", WSAGetLastError());
        return false;
    }

    // Lets create a socket so the server can listen to incoming TCP connections
    result = bind(g_State.m_ServerSocket, serverAddr->ai_addr, (int)serverAddr->ai_addrlen);
    if (result == SOCKET_ERROR) 
    {
        printf("[ERROR:%i]: Failed to bind the server socket", WSAGetLastError());
        return false;
    }
    freeaddrinfo(serverAddr);

    result = listen(g_State.m_ServerSocket, 500);
    if(result == SOCKET_ERROR)
    {
        printf("[ERROR:%i]: Failed to start listening", WSAGetLastError());
        return false;
    }

    // Make the server socket non blocking
    u_long nonBlocking = 1;
    ioctlsocket(g_State.m_ServerSocket, FIONBIO, &nonBlocking);

    return true;
}

void Update()
{
    // Start by checking if we have new clients
    sockaddr clientAddr = {};
    int clientAddrLen = sizeof(clientAddr);
    SOCKET clientSocket = {};
    do
    {
        clientSocket = accept(g_State.m_ServerSocket, &clientAddr, &clientAddrLen);
        if(clientSocket == INVALID_SOCKET)
        {
            int errorCode = WSAGetLastError();
            if(errorCode != WSAEWOULDBLOCK)
            {
                printf("[ERROR:%i]: Error while accepting new client socket...", WSAGetLastError());
            }
        }
        else
        {
            // Add the client.
            for(int i = 0; i < k_MaxClients; ++i)
            {
                if(g_State.m_Clients[i].m_State == ClientState::UNINITIALIZED)
                {
                    g_State.m_Clients[i].m_Socket = clientSocket;
                    g_State.m_Clients[i].m_State = ClientState::ACTIVE;
                    break;
                }
            }
            // If we don't have space, the client will need to handle this and try again later
        }
    } while (clientSocket != INVALID_SOCKET);

    // Handle client connections
    uint8_t buffer[512];
    for(int i = 0; i < k_MaxClients; ++i)
    {
        Client& client = g_State.m_Clients[i];
        if(client.m_State == ClientState::UNINITIALIZED)
        {
            continue;
        }
        else if(client.m_State == ClientState::CLOSING)
        {
            client.m_State = ClientState::UNINITIALIZED;
            closesocket(client.m_Socket);
            break;
        }

        // Handle incoming data.
        // TODO: We need to setup a timeout for each client in case we don't get data or the client doesn't close the socket
        int result = recv(client.m_Socket, (char*)buffer, 512, 0);
        if(result > 0)
        {            
            printf("[INFO]: Recieved data from client \n");
            if(result == sizeof(DataPacket))
            {
                DataPacket packet;
                memcpy(&packet, buffer, result);
                printf("[INFO]: Data from client. Temperature:%f Humidity:%f Pressure:%f \n", packet.m_Temperature, packet.m_Humidity, packet.m_Pressure);

                client.m_State = ClientState::CLOSING;
            }
        }
        else if(result == 0)
        {
            printf("[INFO]: Client closed connection \n");
            client.m_State = ClientState::CLOSING;
        }
        else
        {
            // We only expect to get a nonblocking error here, nothing else
            int wsaError = WSAGetLastError();
            if(wsaError != WSAEWOULDBLOCK)
            {
                printf("[ERROR:%i]: Error recieving from client.", wsaError);
                client.m_State = ClientState::CLOSING;
            }
        }
    }
}