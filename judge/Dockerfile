# Sandboxed Judge Runner Container
FROM alpine:3.20

# Install GCC, G++, Python3, and OpenJDK 17
RUN apk add --no-cache \
    gcc \
    g++ \
    python3 \
    py3-pip \
    openjdk17-jre \
    openjdk17-jdk \
    bash \
    coreutils \
    time \
    curl

# Create unprivileged judge execution user
RUN addgroup -g 1001 judgegroup && \
    adduser -u 1001 -G judgegroup -s /bin/bash -D judgeuser

WORKDIR /judge

# Create isolated scratch directory with restricted permissions
RUN mkdir -p /judge/scratch && chown -R judgeuser:judgegroup /judge

USER judgeuser

CMD ["echo", "CodeArena Isolated Multi-Language Judge Ready"]
