package com.airline.airline_management.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * A plain TCP socket server (NOT an HTTP/REST endpoint) that broadcasts
 * live flight-status updates to any connected client. Each connected
 * client is handled on its own thread, and the server itself runs on
 * a background thread so it doesn't block Spring Boot's startup.
 *
 * In serverless container environments (such as Vercel Functions),
 * raw TCP sockets are bypassed to maintain compatibility with single-port HTTP routing.
 */
@Component
public class FlightStatusSocketServer {

    @Value("${socket.server.enabled:true}")
    private boolean enabled;

    @Value("${socket.server.port:9090}")
    private int port;

    private final List<PrintWriter> clientWriters = new CopyOnWriteArrayList<>();
    private volatile ServerSocket serverSocket;
    private volatile boolean running = true;
    private Thread serverThread;

    @PostConstruct
    public void start() {
        // Vercel serverless containers only permit single-port HTTP routing on $PORT
        if (!enabled || System.getenv("VERCEL") != null) {
            System.out.println("[Socket Server] Raw TCP socket server disabled or bypassed in Vercel container environment.");
            return;
        }

        serverThread = new Thread(this::runServer, "socket-server-listener");
        serverThread.setDaemon(true); // won't prevent the app from shutting down
        serverThread.start();
    }

    private void runServer() {
        try {
            serverSocket = new ServerSocket(port);
            System.out.println("[Socket Server] Listening for flight-status clients on port " + port);

            while (running && serverSocket != null && !serverSocket.isClosed()) {
                try {
                    Socket clientSocket = serverSocket.accept(); // blocks until a client connects
                    System.out.println("[Socket Server] New client connected: " + clientSocket.getInetAddress());

                    Thread clientThread = new Thread(() -> handleClient(clientSocket));
                    clientThread.setDaemon(true);
                    clientThread.start();
                } catch (IOException e) {
                    if (!running) break;
                    System.out.println("[Socket Server] Accept interrupted: " + e.getMessage());
                }
            }
        } catch (Throwable t) {
            System.out.println("[Socket Server] Socket server stopped or unable to bind port " + port + ": " + t.getMessage());
        }
    }

    private void handleClient(Socket clientSocket) {
        try (clientSocket;
             PrintWriter writer = new PrintWriter(clientSocket.getOutputStream(), true)) {
            clientWriters.add(writer);
            writer.println("Connected to Aerowing live flight-status feed.");

            while (running && !clientSocket.isClosed()) {
                Thread.sleep(1000);
            }
        } catch (Exception e) {
            System.out.println("[Socket Server] Client disconnected: " + clientSocket.getInetAddress());
        } finally {
            clientWriters.removeIf(PrintWriter::checkError);
        }
    }

    @PreDestroy
    public void stop() {
        running = false;
        if (serverSocket != null && !serverSocket.isClosed()) {
            try {
                serverSocket.close();
            } catch (IOException ignored) {}
        }
        if (serverThread != null && serverThread.isAlive()) {
            serverThread.interrupt();
        }
    }

    /**
     * Called from anywhere in the app (e.g. FlightController) to push a
     * live message out to every currently connected socket client.
     */
    public void broadcast(String message) {
        for (PrintWriter writer : clientWriters) {
            try {
                writer.println(message);
            } catch (Exception ignored) {}
        }
    }
}