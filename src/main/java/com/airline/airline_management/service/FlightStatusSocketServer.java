package com.airline.airline_management.service;

import jakarta.annotation.PostConstruct;
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
 * This demonstrates real socket programming (java.net.ServerSocket / Socket)
 * combined with multithreading (one thread per client connection).
 */
@Component
public class FlightStatusSocketServer {

    private static final int PORT = 9090;

    // Thread-safe list since multiple client-handler threads read/write it concurrently
    private final List<PrintWriter> clientWriters = new CopyOnWriteArrayList<>();

    @PostConstruct
    public void start() {
        Thread serverThread = new Thread(this::runServer, "socket-server-listener");
        serverThread.setDaemon(true); // won't prevent the app from shutting down
        serverThread.start();
    }

    private void runServer() {
        try (ServerSocket serverSocket = new ServerSocket(PORT)) {
            System.out.println("[Socket Server] Listening for flight-status clients on port " + PORT);

            while (true) {
                Socket clientSocket = serverSocket.accept(); // blocks until a client connects
                System.out.println("[Socket Server] New client connected: " + clientSocket.getInetAddress());

                // Each client gets its own thread so multiple clients can stay
                // connected simultaneously without blocking each other.
                Thread clientThread = new Thread(() -> handleClient(clientSocket));
                clientThread.start();
            }
        } catch (IOException e) {
            System.out.println("[Socket Server] Failed to start: " + e.getMessage());
        }
    }

    private void handleClient(Socket clientSocket) {
        try {
            PrintWriter writer = new PrintWriter(clientSocket.getOutputStream(), true);
            clientWriters.add(writer);
            writer.println("Connected to Aerowing live flight-status feed.");

            // Keep this thread alive for as long as the client stays connected.
            // We don't need to read anything from the client for this use case.
            while (!clientSocket.isClosed()) {
                Thread.sleep(1000);
            }
        } catch (Exception e) {
            System.out.println("[Socket Server] Client disconnected: " + clientSocket.getInetAddress());
        } finally {
            clientWriters.removeIf(PrintWriter::checkError);
        }
    }

    /**
     * Called from anywhere in the app (e.g. FlightController) to push a
     * live message out to every currently connected socket client.
     */
    public void broadcast(String message) {
        for (PrintWriter writer : clientWriters) {
            writer.println(message);
        }
    }
}