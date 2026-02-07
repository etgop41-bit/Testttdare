import * as THREE from 'three';
import { LANES, LANE_WIDTH, PLAYER_START_Z, PLAYER_LANE_CHANGE_COOLDOWN } from './constants.js';

// Player dimensions for 2D sprite
const PLAYER_HEIGHT = 3.5; // Height of the sprite plane
const PLAYER_WIDTH = 2.5; // Width of the sprite plane

export class Player {
    constructor() {
        this.mesh = new THREE.Group(); // Use a Group to hold the sprite
        this.modelLoaded = false; // Flag to track loading
        this.mixer = null; // Not used for 2D sprites
        this.runAction = null; // Not used for 2D sprites
        this.jumpAction = null; // Not used for 2D sprites
        this.animations = null; // Not used for 2D sprites
        this.currentAnimation = null; // Not used for 2D sprites
        
        // Load 2D sprite texture
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('assets/character-ash.png', (texture) => {
            // Create a plane geometry for the sprite
            const geometry = new THREE.PlaneGeometry(PLAYER_WIDTH, PLAYER_HEIGHT);
            
            // Create material with the character texture
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide, // Visible from both sides
                alphaTest: 0.1 // Helps with transparency
            });
            
            const sprite = new THREE.Mesh(geometry, material);
            
            // Position sprite so bottom is at y=0
            sprite.position.y = PLAYER_HEIGHT / 2;
            
            this.mesh.add(sprite);
            this.modelLoaded = true;
            
            console.log('2D Character "Ash" loaded successfully!');
            this.reset();
        }, undefined, (error) => {
            console.error('An error happened loading the character sprite:', error);
            // Fallback to a simple rectangle if loading fails
            const geometry = new THREE.PlaneGeometry(PLAYER_WIDTH, PLAYER_HEIGHT);
            const material = new THREE.MeshBasicMaterial({
                color: 0xff1744, // Red color for Dare Market theme
                side: THREE.DoubleSide
            });
            const fallbackMesh = new THREE.Mesh(geometry, material);
            fallbackMesh.position.y = PLAYER_HEIGHT / 2;
            this.mesh.add(fallbackMesh);
            this.modelLoaded = true;
            console.log('Fallback character sprite created');
            this.reset();
        });
        
        this.targetLane = 1; // Start in the middle lane (0, 1, 2)
        this.currentLane = 1;
        this.isOnCooldown = false;
        this.cooldownTimer = 0;
        
        // Jump state
        this.isJumping = false;
        this.jumpStartY = PLAYER_HEIGHT / 2; // Base Y position for sprite
        this.jumpApexY = this.jumpStartY + 2.8;
        this.jumpDuration = 1.2;
        this.jumpTimer = 0;
        
        // Bounce animation for running effect
        this.bounceTimer = 0;
        this.bounceSpeed = 8; // Speed of bounce animation
        this.bounceHeight = 0.1; // Height of bounce
        
        this.reset(); // Initial reset for the Group position
    }
    
    setTargetLane(laneIndex) {
        const newLane = Math.max(0, Math.min(2, laneIndex)); // Clamp to 0, 1, 2
        // Only allow change if not on cooldown AND the target lane is actually different
        if (!this.isOnCooldown && newLane !== this.targetLane) {
            this.targetLane = newLane;
            this.isOnCooldown = true;
            this.cooldownTimer = PLAYER_LANE_CHANGE_COOLDOWN;
            // console.log(`Changing to lane ${this.targetLane}, Cooldown started.`); // Debugging
        }
    }
    
    jump() {
        // Can only jump if not already jumping
        if (!this.isJumping) {
            this.isJumping = true;
            this.jumpTimer = 0;
            this.playJumpAnimation();
            // console.log("Jump started!"); // Debugging
        }
    }
    
    playJumpAnimation() {
        // No animation needed for 2D sprite - visual handled by position change
        console.log("Jump started!");
    }
    
    startRunAnimation() {
        // No animation needed for 2D sprite - visual handled by bounce effect
        console.log("Running!");
    }
    
    stopRunAnimation() {
        // No animation to stop for 2D sprite
        console.log("Stopped running");
    }
    
    reset() {
        this.currentLane = 1;
        this.targetLane = 1;
        this.isOnCooldown = false;
        this.cooldownTimer = 0;
        this.isJumping = false; // Reset jump state
        this.jumpTimer = 0;
        this.bounceTimer = 0;
        
        // Position the main group (this.mesh)
        this.mesh.position.set(LANES[this.currentLane], this.jumpStartY, PLAYER_START_Z);
        this.mesh.rotation.set(0, 0, 0); // Reset group rotation
        this.mesh.visible = true;
        
        console.log("Player reset - Character: Ash");
    }
    
    update(deltaTime) {
        // No animation mixer for 2D sprites
        
        // --- Bounce Animation for Running Effect ---
        if (!this.isJumping) {
            this.bounceTimer += deltaTime * this.bounceSpeed;
            const bounceOffset = Math.sin(this.bounceTimer) * this.bounceHeight;
            this.mesh.position.y = this.jumpStartY + Math.abs(bounceOffset);
        }
        
        // --- Cooldown Timer ---
        if (this.isOnCooldown) {
            this.cooldownTimer -= deltaTime;
            if (this.cooldownTimer <= 0) {
                this.isOnCooldown = false;
                this.cooldownTimer = 0;
            }
        }
        
        // --- Jump Physics ---
        if (this.isJumping) {
            this.jumpTimer += deltaTime;
            const jumpProgress = Math.min(1, this.jumpTimer / this.jumpDuration); // 0 to 1
            // Simple parabolic arc: y = startY + 4 * apexDelta * (progress - progress^2)
            const apexDelta = this.jumpApexY - this.jumpStartY;
            this.mesh.position.y = this.jumpStartY + 4 * apexDelta * (jumpProgress - jumpProgress * jumpProgress);
            
            // End jump
            if (this.jumpTimer >= this.jumpDuration) {
                this.isJumping = false;
                this.mesh.position.y = this.jumpStartY; // Snap back to ground
                this.bounceTimer = 0; // Reset bounce
            }
        }
        
        // --- Lane Movement ---
        const targetX = LANES[this.targetLane];
        const moveSpeed = 25.0; // Increased from 15.0 for faster lane switching
        const difference = targetX - this.mesh.position.x;
        
        if (Math.abs(difference) > 0.01) {
            const moveDistance = difference * moveSpeed * deltaTime;
            // Prevent overshooting
            if (Math.abs(moveDistance) > Math.abs(difference)) {
                this.mesh.position.x = targetX;
            } else {
                this.mesh.position.x += moveDistance;
            }
        } else {
            this.mesh.position.x = targetX; // Snap to exact position
            this.currentLane = this.targetLane;
        }
        
        // Keep player at constant Z (game moves towards player)
        this.mesh.position.z = PLAYER_START_Z;
    }
}
